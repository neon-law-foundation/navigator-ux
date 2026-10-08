/*
 * Gate: no literal color outside the token layer.
 *
 * The rule is in `src/cli/literal-colors.mjs`, shared with the
 * `navigator-ux check` a consumer runs. This file decides what the token layer
 * is *here*. A boundary that lives only in a document erodes on the first
 * deadline, so this runs in `pnpm check` and fails the build.
 */

import { readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCANNED_EXTENSIONS, findLiteralColors, walk } from '../src/cli/literal-colors.mjs'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The gallery is covered too. It is the most visible code in the package and
// the easiest place for a hardcoded color to look reasonable.
const ROOTS = [join(pkg, 'src'), join(pkg, 'gallery')]

/** Where color is allowed to be written down.
 *
 * `tokens.css` is the shipped identity. Brand layers name colors on purpose —
 * the gallery example is the template an app copies, and `gallery/brands/`
 * holds the compiled identities the gallery switch attaches. */
function isTokenLayer(rel) {
  if (rel === 'src/styles/tokens.css') return true
  if (rel === 'gallery/brand-example-tokens.css') return true
  return rel.startsWith('gallery/brands/') && rel.endsWith('.css')
}

/** Tests assert on color strings; that is not shipping a color. */
const isTest = (rel) => rel.startsWith('src/test/')

/** Generated from the OpenAPI snapshot — not component source. */
const isGenerated = (rel) => rel === 'src/api/schema.d.ts'

const failures = []
let scanned = 0

async function* walkAll(dirs) {
  for (const dir of dirs) yield* walk(dir)
}

for await (const file of walkAll(ROOTS)) {
  const ext = extname(file)
  if (!SCANNED_EXTENSIONS.includes(ext)) continue

  const rel = relative(pkg, file).split('\\').join('/')
  if (isTokenLayer(rel) || isTest(rel) || isGenerated(rel)) continue

  scanned += 1
  failures.push(...findLiteralColors(await readFile(file, 'utf8'), ext, rel))
}

if (failures.length > 0) {
  console.error('Literal colors outside the token layer:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(
    `\n${failures.length} found. Route each through a --nav-* custom property, or, if it is a` +
      `\nnew token, declare it in src/styles/tokens.css with its contrast measured.`,
  )
  process.exit(1)
}

console.log(`no-literal-colors: clean (${scanned} files scanned)`)
