import type { AxeResults, RunOptions } from 'axe-core'
import { API_PREFIX } from '../api/client'
import { SESSION_ENDPOINT } from '../session/session'
import { AXE_RUN_OPTIONS, describeAxeResult } from './axe-report'

/**
 * The checks behind `@neon-law-source-code/navigator-ux/testing/setup`, which
 * a consumer adds to Vitest's `setupFiles` so every test in its suite fails on
 * three things a reviewer cannot see in a diff:
 *
 * 1. **An accessibility violation in what the test rendered**, by axe-core,
 *    under the policy in `axe-report.ts` — WCAG 2.0/2.1 A and AA, the same
 *    tags a browser gate runs. Rules jsdom cannot evaluate are off, because a rule that cannot see the
 *    page reports noise or nothing: `color-contrast` and `link-in-text-block`
 *    need computed colors and a canvas, and jsdom paints neither (the canvas
 *    probe is also what prints "Not implemented: getContext" on every run);
 *    `target-size` needs layout, and every jsdom box is 0×0. `region` is off
 *    because a test renders a fragment, not a page, and would fail on every
 *    component for not sitting inside a landmark. Contrast is gated statically
 *    instead, by `navigator-ux check`.
 * 2. **Any `console.error`**: React's key, act, and hydration warnings are
 *    errors that pass silently in a green suite.
 * 3. **Any `fetch` that leaves the page's origin, or a path outside
 *    `/app/api`** — the `apiFetch` contract, which a component can step
 *    around by calling `fetch` itself. `data:` and `blob:` never leave the
 *    page and pass, as does the session endpoint `SessionProvider` reads.
 *
 * Each check is observation only — responses and output are untouched — and
 * each can be turned off for the suite with `configureNavigatorTesting`, or
 * excused for one test with `allowConsoleError`, `allowRequest`, or
 * `allowAxeViolation`, so a consumer is never one false positive away from
 * deleting the setup file.
 */

/** A substring (or prefix, for a URL) or a pattern. */
export type Matcher = string | RegExp

export interface NavigatorTestingOptions {
  /** `false` turns the axe check off; an object is passed to `axe.run` on top of the defaults. */
  axe?: boolean | RunOptions
  consoleErrors?: boolean
  /** `false` turns the request check off; `allow` adds URLs the suite may reach. */
  network?: boolean | { allow: Matcher[] }
}

/** Rules jsdom cannot evaluate, or that judge a page where a test renders a fragment. */
export const JSDOM_DISABLED_RULES = ['color-contrast', 'link-in-text-block', 'target-size', 'region']

const DEFAULTS: NavigatorTestingOptions = { axe: true, consoleErrors: true, network: true }
let settings: NavigatorTestingOptions = { ...DEFAULTS }

/** Change what the hooks check, for every test after the call. Merges with what is already set. */
export function configureNavigatorTesting(options: NavigatorTestingOptions): void {
  settings = { ...settings, ...options }
}

/** Back to every check on. */
export function resetNavigatorTesting(): void {
  settings = { ...DEFAULTS }
}

/** The settings as they stand, and a function that puts them back. */
export function snapshotSettings(): () => void {
  const saved = settings
  return () => {
    settings = saved
  }
}

/* ------------------------------------------------------------------ axe -- */

type Violation = AxeResults['violations'][number]
type Axe = typeof import('axe-core')

let axeModule: Promise<Axe> | undefined

async function loadAxe(): Promise<Axe> {
  axeModule ??= import('axe-core').then(
    (mod) => ((mod as unknown as { default?: Axe }).default ?? mod) as Axe,
    () => {
      axeModule = undefined
      throw new Error(
        'axe-core is not installed. Add it as a devDependency, or turn the check off with ' +
          'configureNavigatorTesting({ axe: false }).',
      )
    },
  )
  return axeModule
}

function axeOptions(extra: RunOptions | undefined, allowed: Iterable<string> = []): RunOptions {
  const rules: NonNullable<RunOptions['rules']> = {}
  for (const id of [...JSDOM_DISABLED_RULES, ...allowed]) rules[id] = { enabled: false }
  return { ...AXE_RUN_OPTIONS, ...extra, rules: { ...rules, ...extra?.rules } }
}

/** One readable block per violation: the shared one-line description, then the rule's page. */
export function formatAxeViolations(violations: Violation[]): string {
  const blocks = violations.map((violation) => `  ${describeAxeResult(violation)}\n    ${violation.helpUrl}`)
  return `axe found ${violations.length} accessibility violation(s):\n\n${blocks.join('\n\n')}`
}

/** axe's violations in `container`, with the jsdom-blind rules off. */
export async function axeViolations(container: Element, options?: RunOptions): Promise<Violation[]> {
  const axe = await loadAxe()
  const results = await axe.run(container, axeOptions(options))
  return results.violations
}

/** Throws a readable error listing every violation in `container`. */
export async function expectNoAxeViolations(
  container: Element = document.body,
  options?: RunOptions,
): Promise<void> {
  const violations = await axeViolations(container, options)
  if (violations.length > 0) throw new Error(formatAxeViolations(violations))
}

/* ------------------------------------------------------------ requests -- */

function requestUrl(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return String(input)
}

function matches(matcher: Matcher, ...candidates: string[]): boolean {
  return candidates.some((candidate) =>
    typeof matcher === 'string' ? candidate.startsWith(matcher) : matcher.test(candidate),
  )
}

/** Why `raw` breaks the contract, or `null` when it does not. */
export function offContract(raw: string, allow: Matcher[] = []): string | null {
  const base = new URL(globalThis.location?.href ?? 'http://localhost/')
  let url: URL
  try {
    url = new URL(raw, base)
  } catch {
    return `${raw} is not a URL`
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return null
  if (allow.some((matcher) => matches(matcher, raw, url.href, url.pathname))) return null
  if (url.origin !== base.origin) return `${raw} leaves the page's origin (${base.origin})`
  const path = url.pathname
  if (path === API_PREFIX || path.startsWith(`${API_PREFIX}/`) || path === SESSION_ENDPOINT) return null
  return `${raw} is outside ${API_PREFIX}`
}

/* ---------------------------------------------------- one test's record -- */

interface MockLike {
  mock: { calls: unknown[][] }
}

const isMock = (value: unknown): value is MockLike =>
  typeof value === 'function' && Array.isArray((value as Partial<MockLike>).mock?.calls)

interface TestRecord {
  consoleErrors: unknown[][]
  requests: string[]
  allowedConsole: Matcher[]
  allowedRequests: Matcher[]
  allowedRules: Set<string>
  restore: Array<() => void>
}

let current: TestRecord | undefined

function record(name: string): TestRecord {
  if (!current) {
    throw new Error(`${name} only works inside a test, with the navigator-ux testing setup installed.`)
  }
  return current
}

/** Let `console.error` calls matching `matcher` through, for the current test. */
export function allowConsoleError(matcher: Matcher): void {
  record('allowConsoleError').allowedConsole.push(matcher)
}

/** Let requests matching `matcher` (a URL prefix, or a pattern) through, for the current test. */
export function allowRequest(matcher: Matcher): void {
  record('allowRequest').allowedRequests.push(matcher)
}

/** Turn one axe rule off, by id, for the current test. */
export function allowAxeViolation(ruleId: string): void {
  record('allowAxeViolation').allowedRules.add(ruleId)
}

/** printf the way the console does it, so a matcher sees the message a reader sees. */
export function formatConsoleArgs(args: unknown[]): string {
  const [first, ...rest] = args
  if (typeof first !== 'string') return args.map(String).join(' ')
  const message = first.replace(/%[sdifoOc%]/g, (token) => {
    if (token === '%%') return '%'
    if (rest.length === 0) return token
    const value = rest.shift()
    return token === '%c' ? '' : String(value)
  })
  return [message, ...rest.map(String)].join(' ')
}

function observeConsole(state: TestRecord): void {
  const original = console.error
  console.error = function observedConsoleError(this: unknown, ...args: unknown[]) {
    state.consoleErrors.push(args)
    return original.apply(this, args)
  }
  state.restore.push(() => {
    console.error = original
  })
}

/*
 * `fetch` is replaced with an accessor rather than a wrapped value, so a test
 * that assigns its own `globalThis.fetch = vi.fn()` assigns *underneath* the
 * observer instead of over it. A test that uses `vi.stubGlobal` redefines the
 * property outright; its mock's calls are read afterwards instead.
 */
function observeFetch(state: TestRecord): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
  let inner: unknown = globalThis.fetch
  if (typeof inner !== 'function') return
  const initial = inner
  const before = isMock(initial) ? initial.mock.calls.length : 0

  let active = true
  const observed = function observedFetch(this: unknown, ...args: unknown[]) {
    if (active) state.requests.push(requestUrl(args[0]))
    return (inner as (...a: unknown[]) => unknown).apply(this, args)
  }
  const get = () => observed
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    enumerable: descriptor?.enumerable ?? true,
    get,
    set: (value: unknown) => {
      inner = value
    },
  })

  state.restore.push(() => {
    active = false
    const now = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
    if (now?.get === get) {
      const enumerable = descriptor?.enumerable ?? true
      Object.defineProperty(globalThis, 'fetch', { configurable: true, enumerable, writable: true, value: inner })
      return
    }
    // Stubbed over: read what the stub saw. Its owner restores it.
    const stub: unknown = now?.value ?? now?.get?.()
    if (isMock(stub)) {
      const calls = stub.mock.calls.slice((stub as unknown) === initial ? before : 0)
      state.requests.push(...calls.map((call) => requestUrl(call[0])))
    }
  })
}

/** Start observing. The setup file calls this in `beforeEach`. */
export function beginTest(): void {
  current = {
    consoleErrors: [],
    requests: [],
    allowedConsole: [],
    allowedRequests: [],
    allowedRules: new Set(),
    restore: [],
  }
  if (settings.consoleErrors !== false) observeConsole(current)
  if (settings.network !== false) observeFetch(current)
}

/**
 * Stop observing and judge the test. Throws one error naming every problem.
 *
 * The console and `fetch` are restored *before* axe runs, so nothing axe does
 * is counted against the test.
 */
export async function endTest(): Promise<void> {
  const state = current
  if (!state) return
  current = undefined
  for (const restore of state.restore.reverse()) restore()

  // Settings are read again here, so a `configureNavigatorTesting` made
  // during the test applies to it.
  const problems: string[] = []

  const errors = state.consoleErrors
    .map(formatConsoleArgs)
    .filter(
      (message) =>
        !state.allowedConsole.some((matcher) =>
          typeof matcher === 'string' ? message.includes(matcher) : matcher.test(message),
        ),
    )
  if (settings.consoleErrors !== false && errors.length > 0) {
    const listed = errors.map((message) => `  ${message.split('\n')[0]}`).join('\n')
    problems.push(
      `console.error was called ${errors.length} time(s):\n\n${listed}\n\n` +
        'Fix the cause, or excuse one with allowConsoleError(matcher).',
    )
  }

  const network = settings.network
  const allow = [...(typeof network === 'object' ? network.allow : []), ...state.allowedRequests]
  const requests = state.requests
    .map((raw) => offContract(raw, allow))
    .filter((why): why is string => why !== null)
  if (network !== false && requests.length > 0) {
    problems.push(
      `fetch reached outside the apiFetch contract:\n\n${requests.map((why) => `  ${why}`).join('\n')}\n\n` +
        'Go through apiFetch, or excuse one with allowRequest(matcher).',
    )
  }

  const axe = settings.axe
  if (axe !== false && typeof document !== 'undefined' && document.body.childElementCount > 0) {
    const options = typeof axe === 'object' ? axe : undefined
    const results = await (await loadAxe()).run(document.body, axeOptions(options, state.allowedRules))
    if (results.violations.length > 0) {
      problems.push(
        `${formatAxeViolations(results.violations)}\n\nFix the markup, or excuse one rule with allowAxeViolation(id).`,
      )
    }
  }

  if (problems.length > 0) throw new Error(`navigator-ux testing:\n\n${problems.join('\n\n')}`)
}
