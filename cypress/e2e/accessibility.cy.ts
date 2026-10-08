import { auditWithAxe, formatAxeReport, type AxeInPage } from '../../src/testing/axe-report'

/*
 * The browser accessibility gate: axe-core 4.10.2, WCAG 2.0/2.1 A and AA, in
 * both color schemes. The policy — what fails, what is only reported — is
 * Navigator's, and lives in src/testing/axe-report.ts so a consumer's own
 * suite applies the same one.
 *
 * Scoped the way Navigator scopes its gate, not one run per route. The
 * components are shared, so auditing every page re-finds the same defect on
 * every page that mounts it. Three layers instead:
 *
 * 1. Components. `/components/all` renders every exported component (kept
 *    complete by src/test/gallery-coverage.test.ts), audited as a whole
 *    document. A component defect fails here, once, at its source.
 * 2. Brands. A brand layer is where a brand's colors meet the chrome and the
 *    components, so each sheet in gallery/brands/ gets one full-document audit
 *    of the same page, wearing it. Layer 1 is the library with no layer.
 * 3. Content. Pages whose own composition is under audit — the sample pages,
 *    the public-site specimen — scoped to `main`, because layer 2 owns the
 *    chrome around them. Pages that differ only in their data are sampled:
 *    one sample page per kind, not all forty.
 *
 * Light and dark are two arms of `prefers-color-scheme` with no toggle, so a
 * browser renders the one its host reports — CI light, a developer's Mac
 * usually dark. Every audit therefore runs under both, emulated over the
 * DevTools protocol, and the page is asked which one it resolved, so a browser
 * that ignored the emulation fails instead of auditing one scheme twice.
 */

type Scheme = 'light' | 'dark'

const SCHEMES: Scheme[] = ['light', 'dark']

const GALLERY = Cypress.expose('GALLERY_URL') as string

/** Every sheet in gallery/brands/, listed by cypress.config.ts. */
const BRANDS = Cypress.expose('GALLERY_BRANDS') as string[]

/** One sample page per kind in gallery/Showcase.tsx, plus the indexes. */
const CONTENT_ROUTES = [
  '/pages',
  '/pages/new-matter', // form
  '/pages/case-strategy', // review
  '/pages/preservation-notice', // document
  '/pages/initial-disclosures', // queue
  '/pages/meet-confer', // timeline
  '/pages/subpoena-packet', // workflow
  '/pages/motion-outline', // outline
  '/pages/verify-the-record', // verify
  '/pages/pitch-to-pleadings', // journey
  '/councils',
  '/design',
  // The public-site specimen: home, the catalog, checkout, a plan, and a
  // Markdown page. The other plans are the same component over other rows.
  '/neon',
  '/neon/services',
  '/neon/checkout?sku=llc-launch',
  '/neon/fractional-gc',
  '/neon/litigation',
]

let axeSource = ''

before(() => {
  cy.task<string>('axeSource').then((source) => {
    axeSource = source
  })
})

function emulateScheme(scheme: Scheme) {
  cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: '', features: [{ name: 'prefers-color-scheme', value: scheme }] },
    }),
    { log: false },
  )
}

/** Visit, prove the page resolved `scheme`, and audit `scope` under the shared policy. */
function assertPassesAxe(route: string, scope: string, scheme: Scheme) {
  cy.visit(`${GALLERY}${route}`)
  cy.get(scope, { timeout: 15_000 }).should('exist')
  cy.window().then((win) => {
    expect(
      win.matchMedia('(prefers-color-scheme: dark)').matches,
      `${route} resolved prefers-color-scheme: ${scheme} — the browser ignored the emulation, so this run would audit the wrong scheme`,
    ).to.equal(scheme === 'dark')
  })
  // Let web fonts settle: a contrast check measures the face that rendered.
  cy.document().then((doc) => doc.fonts.ready)
  cy.window()
    .then({ timeout: 120_000 }, (win) => {
      win.eval(axeSource)
      return auditWithAxe((win as unknown as { axe: AxeInPage }).axe, win.document, scope)
    })
    .then((report) => {
      // Every undecided check is printed whether or not the audit fails, so
      // the CI log carries the whole picture of what axe could not decide.
      const { failure, undecided } = formatAxeReport(report, `within \`${scope}\` on ${route} [${scheme}]`)
      if (undecided) cy.task('log', undecided, { log: false })
      cy.wrap(failure, { log: false }).then((message) => {
        if (message) throw new Error(message)
      })
    })
}

for (const scheme of SCHEMES) {
  describe(`accessibility [${scheme}]`, () => {
    beforeEach(() => emulateScheme(scheme))

    it('the component gallery passes a full-document audit', () => {
      assertPassesAxe('/components/all', 'html', scheme)
    })

    it('finds the brand sheets to audit', () => {
      expect(BRANDS, 'brand sheets in gallery/brands/').to.have.length.greaterThan(0)
    })

    for (const brand of BRANDS) {
      it(`the ${brand} brand layer passes a full-document audit`, () => {
        assertPassesAxe(`/components/all?brand=${brand}`, 'html', scheme)
        // An unknown id falls back to the library identity, which would audit
        // the default twice under another name.
        cy.get('#gallery-brand-layer').should('exist')
      })
    }

    for (const route of CONTENT_ROUTES) {
      it(`${route} passes an audit of \`main\``, () => {
        assertPassesAxe(route, 'main', scheme)
      })
    }
  })
}
