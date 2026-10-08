import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { defineConfig } from 'cypress'

/*
 * Specs share one origin: the fake OpenAPI harness (CYPRESS_BASE_URL, :5175) — except accessibility.cy.ts, which
 * audits the gallery on its own (CYPRESS_GALLERY_URL, :5176).
 * neon-site.cy.ts visits `/neon` (legacy `?showcase=neon` still parses) on that origin and asserts copy from
 * gallery/content/en.yaml plus the Markdown page files.
 *
 * Those files reference Navigator's shared marketing catalog with `{shared:<key>}`. The tasks below resolve those
 * references the same way the browser build does, so a spec that asserts a sentence is asserting the sentence the
 * pinned catalog actually publishes — not the token standing in for it.
 */

const root = process.cwd()

const catalog = JSON.parse(readFileSync(resolve(root, 'gallery/content/marketing-catalog.json'), 'utf8'))

function shared(key: string): string {
  const value = catalog.payload.entries[key]
  if (value === undefined) throw new Error(`marketing catalog: no entry for \`${key}\``)
  return value
}

function resolveShared(raw: string): string {
  return raw.replace(/\{shared:([A-Za-z0-9_.]+)\}/g, (_match, key: string) => shared(key))
}

function pageDoc(name: string) {
  const raw = resolveShared(readFileSync(resolve(root, `gallery/content/pages/${name}.md`), 'utf8'))
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match?.[1]) throw new Error(`missing front matter in ${name}.md`)
  return { matter: parse(match[1]), body: (match[2] ?? '').trim() }
}

/*
 * The brand layers accessibility.cy.ts audits, read from the sheets on disk
 * rather than listed in the spec, so a brand added to gallery/brands/ enters
 * the gate by existing. `faces.css` is the shared @font-face file every brand
 * draws on, not a brand.
 */
function galleryBrandSheets(): string[] {
  return readdirSync(resolve(root, 'gallery/brands'))
    .filter((file) => file.endsWith('.css') && file !== 'faces.css')
    .map((file) => file.slice(0, -'.css'.length))
    .sort()
}

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:5175',
    // accessibility.cy.ts audits the gallery on its own origin; e2e/run.mjs starts it.
    expose: {
      GALLERY_URL: process.env.CYPRESS_GALLERY_URL ?? 'http://127.0.0.1:5176',
      GALLERY_BRANDS: galleryBrandSheets(),
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on) {
      on('task', {
        /*
         * `{site_name}` is the second slot the browser fills, after the shared
         * references: Navigator authors its lead-form sentences once and its
         * renderer names the site. Filling it here too is what keeps a spec
         * asserting the sentence a reader is shown rather than the template.
         */
        neonEn() {
          const resolved = resolveShared(readFileSync(resolve(root, 'gallery/content/en.yaml'), 'utf8'))
          const { brand } = parse(resolved) as { brand: string }
          return parse(resolved.replaceAll('{site_name}', brand))
        },
        neonPage(name: string) {
          return pageDoc(name)
        },
        /** The pinned catalog itself, so a spec can assert the rendered page carries it. */
        neonCatalog() {
          return catalog
        },
        /** The axe build the gate injects, from the installed devDependency — never a CDN. */
        axeSource() {
          return readFileSync(resolve(root, 'node_modules/axe-core/axe.min.js'), 'utf8')
        },
        /** Print to the terminal running Cypress, so a CI log carries what axe could not decide. */
        log(message: string) {
          process.stdout.write(`${message}\n`)
          return null
        },
      })
    },
  },
})
