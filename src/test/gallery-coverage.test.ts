import { describe, expect, it } from 'vitest'

const [indexSource = ''] = Object.values(
  import.meta.glob<string>('../index.ts', { query: '?raw', import: 'default', eager: true }),
)

/*
 * Every exported component is shown in the gallery.
 *
 * The browser accessibility gate (cypress/e2e/accessibility.cy.ts) audits
 * `/components/all` as its component layer, so a component that is not on that
 * page is a component no browser audit ever renders. This is what makes that
 * layer grow by itself: a new export cannot land without entering the page the
 * gate reads. It is Navigator's `every_public_component_is_shown_in_the_design_gallery`.
 */

const gallerySources = Object.values(
  import.meta.glob<string>('../../gallery/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
).join('\n')

const componentSources = Object.values(
  import.meta.glob<string>('../components/**/*.tsx', { query: '?raw', import: 'default', eager: true }),
).join('\n')

/** Shown because a component the gallery renders renders it. Child → parent. */
const COMPOSED: Record<string, string> = {
  AuthorityDialog: 'AuthorityList',
  BrandColorField: 'BrandEditorPanel',
  BrandFontUploadField: 'BrandEditorPanel',
  BrandLogoUploadField: 'BrandEditorPanel',
  Field: 'DatePicker',
  Runs: 'Prose',
  ShortcutHelp: 'ShortcutHost',
  ShortcutList: 'ShortcutHelp',
  TestimonialGrid: 'TestimonialSection',
}

/** Exported, PascalCase, and not a thing that can stand on a specimen page. */
const NOT_RENDERED: Record<string, string> = {
  ApiRequestError: 'an Error subclass, not a component',
  NavigationChords: 'registers keyboard chords and renders no markup',
  SessionProvider: 'a context provider; it renders its children and nothing of its own',
  ShortcutProvider: 'a context provider; it renders its children and nothing of its own',
  ThemeProvider: 'a context provider; it renders its children and nothing of its own',
  Shell: "renders the page's `<main>`, and a specimen inside the gallery's own would nest one main in another",
}

/** The value exports of src/index.ts that are named like components. */
function exportedComponents(): string[] {
  const names = new Set<string>()
  for (const [, list] of indexSource.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const raw of (list ?? '').split(',')) {
      const entry = raw.trim()
      if (!entry || entry.startsWith('type ')) continue
      const name = entry.split(/\s+as\s+/).pop()!.trim()
      if (/^[A-Z][a-z]/.test(name)) names.add(name)
    }
  }
  return [...names].sort()
}

const rendersIn = (source: string, name: string) => new RegExp(`<${name}[\\s>/]`).test(source)

describe('the component gallery', () => {
  const exported = exportedComponents()

  it('finds the exported components it is checking', () => {
    // A floor, not a count: it catches a parser that stopped reading the index.
    expect(exported.length).toBeGreaterThan(100)
  })

  it('shows every exported component, directly or inside one it shows', () => {
    const missing = exported.filter((name) => {
      if (name in NOT_RENDERED) return false
      if (rendersIn(gallerySources, name)) return false
      const parent = COMPOSED[name]
      return !(parent && rendersIn(componentSources, name))
    })
    expect(missing, 'add a specimen for each to the gallery — the accessibility gate audits only what it shows').toEqual([])
  })

  it('composes each child inside a parent the gallery reaches', () => {
    const reaches = (name: string, seen = new Set<string>()): boolean => {
      if (rendersIn(gallerySources, name)) return true
      const parent = COMPOSED[name]
      if (!parent || seen.has(name)) return false
      return reaches(parent, seen.add(name))
    }
    for (const child of Object.keys(COMPOSED)) expect(reaches(child), child).toBe(true)
  })

  it('keeps its exceptions honest', () => {
    for (const name of [...Object.keys(COMPOSED), ...Object.keys(NOT_RENDERED)]) {
      expect(exported, `${name} is no longer exported`).toContain(name)
    }
    for (const name of Object.keys(COMPOSED)) {
      expect(rendersIn(gallerySources, name), `${name} is shown directly now; drop it from COMPOSED`).toBe(false)
    }
  })
})
