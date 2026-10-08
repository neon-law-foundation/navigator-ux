import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { beginTest, endTest, snapshotSettings } from './checks'

/**
 * Vitest `setupFiles` entry: every test fails on an axe violation, a
 * `console.error`, or a request outside `/app/api`. What each check does and
 * how to excuse one is in `checks.ts`.
 *
 * **This file takes over Testing Library's cleanup.** Its auto-cleanup is an
 * `afterEach` registered when a test file imports it — after this file — and
 * Vitest runs `afterEach` hooks last-registered-first, so the DOM would be
 * empty by the time axe looked and every render would pass. Setting
 * `RTL_SKIP_AUTO_CLEANUP` before any test file loads turns that hook off, and
 * this one unmounts after the checks instead. The same switch also skips
 * Testing Library marking the environment for act(), so that is done here
 * too, or React would warn on every update and the warning would fail the
 * test. A suite that set the variable itself keeps doing its own cleanup.
 *
 * An `afterEach` a test file registers itself still runs before this one, so
 * a file that cleans up by hand should do it after the checks or not at all.
 */

type ActGlobal = typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }

// `process` is read off `globalThis` so the library keeps Node's types out of scope.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const ownsCleanup = env !== undefined && !env.RTL_SKIP_AUTO_CLEANUP

async function cleanupRendered(): Promise<void> {
  let cleanup: (() => void) | undefined
  try {
    ;({ cleanup } = await import('@testing-library/react'))
  } catch {
    // Not installed, so nothing of its to unmount.
  }
  cleanup?.()
}

if (ownsCleanup) {
  env.RTL_SKIP_AUTO_CLEANUP = 'true'
  let previousAct: boolean | undefined
  beforeAll(() => {
    previousAct = (globalThis as ActGlobal).IS_REACT_ACT_ENVIRONMENT
    ;(globalThis as ActGlobal).IS_REACT_ACT_ENVIRONMENT = true
  })
  // Put back per file: without isolation this file runs again for the next
  // test file in the same process, and must not find its own value there.
  afterAll(() => {
    ;(globalThis as ActGlobal).IS_REACT_ACT_ENVIRONMENT = previousAct
    delete env.RTL_SKIP_AUTO_CLEANUP
  })
}

// Installed from a package, the checks module loads once per worker rather
// than once per file, so a `configureNavigatorTesting` at the top of one test
// file would otherwise carry into the next.
afterAll(snapshotSettings())

beforeEach(beginTest)

afterEach(async () => {
  try {
    await endTest()
  } finally {
    if (ownsCleanup) await cleanupRendered()
  }
})
