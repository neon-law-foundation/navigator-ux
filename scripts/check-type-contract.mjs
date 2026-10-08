/*
 * Gate: the type contract — two weights, and no literal corner radius.
 *
 * The sibling of `check-no-literal-colors.mjs`, for the two properties that went
 * the same way color did.
 *
 * **Weights.** The library ships 400 and 700 and nothing else, which `fonts.css`
 * has said since the first face was vendored. Nothing obeyed it: `theme.css`
 * asked for 600 in twenty-three rules and `matter.css` for 800 in eighteen, and
 * every one of them resolved to a browser-synthesized face. It was invisible for
 * as long as `matter.css` was monospace — a system mono has every weight — and it
 * became visible the moment those rules took the brand typeface. A synthesized
 * bold next to a real one is the kind of wrong that reads as "cheap" without a
 * reader ever being able to say why.
 *
 * The two-weight rule outlived the font it was written for, and it was never
 * really that font's doing: GORP ships at least six weights, 200 through 700, and
 * only two of them were ever vendored as woff2. Source Serif 4 has eight and two
 * are vendored. Either way the ceiling is a decision about this design system
 * rather than a limit the typeface imposes. It is kept because the
 * hierarchy was built on it: a rule that wants "a bit bolder than body" has to
 * reach for size or color, which is the distinction that actually survives at
 * small sizes. Vendoring a third weight is a design change, not a bug fix.
 *
 * **Radii.** Same shape of problem. The radius scale is a set of tokens, and
 * `matter.css` carried literal `3px`, `7px`, and `12px` corners that predated
 * them, so a panel and a card built from the same system rounded differently.
 *
 * `999px` and `50%` stay legal. A pill and a circle are geometry — they mean "as
 * round as this box gets" rather than a step on a scale, and a token would make
 * them wrong at every size but one. `0` stays legal too: a full-bleed dialog
 * squaring its corners on a phone is a deliberate absence of radius.
 *
 * A boundary that lives only in a document erodes on the first deadline, so this
 * runs in `pnpm check` and fails the build.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The gallery is covered too, for the same reason the color gate covers it: it
// is the most visible code in the package and the easiest place for a
// hand-tuned weight to look reasonable.
const ROOTS = [join(pkg, 'src'), join(pkg, 'gallery')]

/** The two weights the typeface actually has. */
const WEIGHTS = new Set(['400', '700'])

/** Radii that are geometry rather than a step on the scale. */
const GEOMETRIC_RADII = new Set(['0', '50%', '999px'])

/** Tests assert on these values; that is not shipping one. */
const isTest = (rel) => rel.startsWith('src/test/')

/** Generated from the OpenAPI snapshot — not component source. */
const isGenerated = (rel) => rel === 'src/api/schema.d.ts'

/**
 * Blank comments out so prose about a weight is not a weight.
 *
 * Every character is replaced with a space and every newline kept, rather than
 * the comment collapsing to one space. Offsets into the result therefore still
 * index the original text, which is what makes the reported line numbers exact —
 * collapsing shifts every offset after the first comment, and in a file that
 * opens with a licence header that is all of them.
 */
function blankComments(text, ext) {
  const blank = (match) => match.replace(/[^\n]/g, ' ')
  const withoutBlock = text.replace(/\/\*[\s\S]*?\*\//g, blank)
  // CSS has no line comments, and stripping `//` there would eat `url(//host)`.
  return ext === '.css' ? withoutBlock : withoutBlock.replace(/\/\/[^\n]*/g, blank)
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

async function* walkAll(dirs) {
  for (const dir of dirs) yield* walk(dir)
}

const failures = []
let scanned = 0

for await (const file of walkAll(ROOTS)) {
  const ext = extname(file)
  if (!['.ts', '.tsx', '.css'].includes(ext)) continue

  const rel = relative(pkg, file).split('\\').join('/')
  if (isTest(rel) || isGenerated(rel)) continue

  scanned += 1
  const raw = await readFile(file, 'utf8')
  const text = blankComments(raw, ext)

  const report = (index, message) => {
    const line = raw.slice(0, index).split('\n').length
    failures.push(`${rel}:${line}  ${message}`)
  }

  // `font-weight: 600`
  for (const match of text.matchAll(/font-weight:\s*(\d+)/g)) {
    if (!WEIGHTS.has(match[1])) {
      report(match.index, `font-weight ${match[1]}: the library vendors 400 and 700 only`)
    }
  }

  // The `font:` shorthand, whose first numeric token is the weight —
  // `font: 800 10px var(--nav-font-family)`.
  for (const match of text.matchAll(/font:\s*(\d{3})\s/g)) {
    if (!WEIGHTS.has(match[1])) {
      report(match.index, `font shorthand weight ${match[1]}: the library vendors 400 and 700 only`)
    }
  }

  // A corner radius that is neither a token nor geometry.
  for (const match of text.matchAll(/border-radius:\s*([^;{}]+)/g)) {
    const value = match[1].trim()
    if (value.includes('var(--nav-radius')) continue
    if (GEOMETRIC_RADII.has(value)) continue
    report(match.index, `border-radius ${value}: use a --nav-radius-* token`)
  }
}

if (failures.length > 0) {
  console.error('Type-contract violations:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(
    `\n${failures.length} found. Weight hierarchy here is binary — 400 or 700 — so a rule that` +
      `\nwants "a bit bolder" changes size or color instead. Corners come from --nav-radius,` +
      `\n--nav-radius-xs, -sm, -md, -lg, or -xl; a pill is 999px and a circle is 50%.`,
  )
  process.exit(1)
}

console.log(`type-contract: clean (${scanned} files scanned)`)
