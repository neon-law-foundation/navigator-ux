import type { AxeResults, ElementContext, NodeResult, Result, RunOptions } from 'axe-core'

/**
 * One accessibility policy, applied by the jsdom setup hook and by a browser
 * gate alike. It is Navigator's (`server/tests/accessibility_e2e.rs`), ported
 * rather than restated, so a component that passes here passes there.
 *
 * - **The ruleset is WCAG 2.0 and 2.1, levels A and AA**, selected by tag.
 *   axe's best-practice rules are advice, not conformance, and a gate that
 *   fails on advice gets switched off.
 * - **`violations` fail. `incomplete` is reported, not failed** — axe could not
 *   decide it, overwhelmingly `color-contrast` over an image or a gradient,
 *   whose real background is in pixels axe cannot read. Failing on those would
 *   redden every image-backed band and get the check deleted.
 * - **Except one shape of `incomplete`, which is a defect**: see
 *   {@link undecidableContrastFailures}.
 *
 * Nothing here imports axe at runtime. A browser suite injects axe into the
 * page itself and passes it to {@link auditWithAxe}.
 */

/** The WCAG levels audited: 2.0 and 2.1, A and AA. */
export const AXE_WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/** `axe.run` options that select exactly {@link AXE_WCAG_TAGS}. */
export const AXE_RUN_OPTIONS: RunOptions = {
  runOnly: { type: 'tag', values: [...AXE_WCAG_TAGS] },
}

/** What one axe run found, as lines a person can act on. */
export interface AxeReport {
  /** Decided WCAG A/AA failures. Any entry fails. */
  violations: string[]
  /** Checks axe could not decide. Reported, never failed on their own. */
  incomplete: string[]
  /** The part of `incomplete` that is a defect: text over no declared background. */
  undecidableContrast: string[]
}

type ResultLike = Pick<Result, 'id' | 'help'> & {
  impact?: Result['impact'] | undefined
  nodes: Array<Partial<Pick<NodeResult, 'target' | 'any'>>>
}

interface ContrastData {
  fgColor?: string | null
  bgColor?: string | null
  messageKey?: string | null
}

/**
 * The `color-contrast` check's payload on a node, if it carries one. Read by
 * `id` rather than by position, so a node carrying several checks still works.
 */
export function contrastData(node: Partial<Pick<NodeResult, 'any'>>): ContrastData | undefined {
  const check = node.any?.find((entry) => entry.id === 'color-contrast')
  return check ? ((check.data ?? {}) as ContrastData) : undefined
}

/**
 * A node's selector, plus the colors axe resolved for it when the check was a
 * contrast check. "axe could not decide" says nothing on its own; "fg #ffffff,
 * bg none" names the element with no measurable background.
 */
export function describeAxeNode(node: Partial<Pick<NodeResult, 'target' | 'any'>>): string {
  const target = (node.target ?? []).map(String).join(' ')
  const data = contrastData(node)
  if (!data) return target
  const color = (value: string | null | undefined) => value ?? 'none'
  return `${target} (fg ${color(data.fgColor)}, bg ${color(data.bgColor)}, reason ${data.messageKey ?? 'undetermined'})`
}

/** One line for an axe result: impact, rule, what it means, and every node. */
export function describeAxeResult(result: ResultLike): string {
  const targets = result.nodes.map(describeAxeNode).join('; ')
  return `[${result.impact ?? 'unknown'}] ${result.id}: ${result.help} — at ${targets}`
}

/**
 * The `incomplete` results that are defects rather than genuine undecidables.
 *
 * axe leaves `color-contrast` undecided for two reasons, and only one is the
 * page's fault. Over a photograph or gradient it names why (`bgImage`,
 * `bgGradient`, `bgOverlap`, …) in `messageKey`, and a person has to judge it.
 * When it walked every ancestor and found no opaque background at all, it
 * returns `bgColor: null` *with no reason*: the page never declares what is
 * behind the text, so its contrast is whatever the viewport happens to be.
 * That second shape — and only that one — is returned here, to be failed on.
 */
export function undecidableContrastFailures(incomplete: readonly ResultLike[]): string[] {
  return incomplete
    .filter((result) => result.id === 'color-contrast')
    .flatMap((result) => result.nodes)
    .filter((node) => {
      const data = contrastData(node)
      return data !== undefined && (data.bgColor ?? null) === null && (data.messageKey ?? null) === null
    })
    .map(describeAxeNode)
}

/** An axe result pair, turned into the report the policy judges. */
export function axeReport(results: { violations: readonly ResultLike[]; incomplete?: readonly ResultLike[] }): AxeReport {
  const incomplete = results.incomplete ?? []
  return {
    violations: results.violations.map(describeAxeResult),
    incomplete: incomplete.map(describeAxeResult),
    undecidableContrast: undecidableContrastFailures(incomplete),
  }
}

/** True when the policy passes the report: no violation, no unmeasurable text. */
export function axeReportPasses(report: AxeReport): boolean {
  return report.violations.length === 0 && report.undecidableContrast.length === 0
}

/**
 * The report as text, headed by `where` (a route, a scope, a scheme). The
 * failure half names every violation and every element with no declared
 * background; the undecided half lists what axe could not decide, for the log.
 * Either is `null` when there is nothing to say.
 */
export function formatAxeReport(report: AxeReport, where: string): { failure: string | null; undecided: string | null } {
  const lines = (entries: string[]) => entries.map((entry) => `  ${entry}`).join('\n')
  const failures: string[] = []
  if (report.violations.length > 0) {
    failures.push(`axe found ${report.violations.length} WCAG A/AA violation(s) ${where}:\n${lines(report.violations)}`)
  }
  if (report.undecidableContrast.length > 0) {
    failures.push(
      `${report.undecidableContrast.length} element(s) ${where} carry text over no declared background at all — ` +
        'axe found no opaque ancestor to measure against, so the contrast is whatever the viewport happens to be:\n' +
        `${lines(report.undecidableContrast)}\n` +
        "Give the element (or an ancestor) an opaque background in the theme's own tokens.",
    )
  }
  return {
    failure: failures.length > 0 ? failures.join('\n\n') : null,
    undecided:
      report.incomplete.length > 0
        ? `axe could not decide ${report.incomplete.length} check(s) ${where}:\n${lines(report.incomplete)}`
        : null,
  }
}

/** The slice of axe a page exposes once axe.min.js has been injected into it. */
export interface AxeInPage {
  run(context: ElementContext, options: RunOptions): Promise<Pick<AxeResults, 'violations' | 'incomplete'>>
}

/**
 * Run the policy against `scope` (a CSS selector) in `doc`, with an axe that
 * was injected into that page. A scope that matches nothing, or a run that
 * throws, comes back as a violation rather than as a pass — an audit that did
 * not happen must not read as one that found nothing.
 */
export async function auditWithAxe(axe: AxeInPage, doc: Document, scope = 'html'): Promise<AxeReport> {
  const root = doc.querySelector(scope)
  if (!root) {
    return axeReport({ violations: [{ id: 'axe-scope-missing', impact: 'serious', help: `no element matched ${scope}`, nodes: [] }] })
  }
  try {
    return axeReport(await axe.run(root, AXE_RUN_OPTIONS))
  } catch (error) {
    return axeReport({ violations: [{ id: 'axe-run-error', impact: 'serious', help: String(error), nodes: [] }] })
  }
}
