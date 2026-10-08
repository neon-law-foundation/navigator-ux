// `@neon-law-source-code/navigator-ux/testing`: the helpers, with or without the setup file.
export {
  allowAxeViolation,
  allowConsoleError,
  allowRequest,
  axeViolations,
  configureNavigatorTesting,
  expectNoAxeViolations,
  formatAxeViolations,
  JSDOM_DISABLED_RULES,
} from './checks'
export type { Matcher, NavigatorTestingOptions } from './checks'

// The policy itself, for a consumer's own browser gate (Cypress, Playwright):
// the same tags, the same describers, and the same `incomplete` rule.
export {
  AXE_RUN_OPTIONS,
  AXE_WCAG_TAGS,
  auditWithAxe,
  axeReport,
  axeReportPasses,
  describeAxeNode,
  describeAxeResult,
  formatAxeReport,
  undecidableContrastFailures,
} from './axe-report'
export type { AxeInPage, AxeReport } from './axe-report'
