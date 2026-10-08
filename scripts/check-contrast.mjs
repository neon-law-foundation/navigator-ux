/*
 * Gate: every pairing the palette claims actually clears its contrast floor,
 * in the library's own tokens and in every gallery brand sheet layered on them.
 *
 * The pairing table, the floors, and the arithmetic are in
 * `src/cli/contrast.mjs`, shared with the `navigator-ux check` a consumer runs
 * against its own brand layer. The gallery sheets are gated because each
 * carries hand-written ratio comments, which is the thing this gate exists to
 * stop trusting.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  declaresColor,
  layer,
  measure,
  parseBrandLayer,
  parseTokens,
} from '../src/cli/contrast.mjs'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const base = parseTokens(await readFile(resolve(pkg, 'src/styles/tokens.css'), 'utf8'))

function report(where, fix, { failures, lines }) {
  if (verbose) console.log(lines.join('\n'))
  if (failures.length === 0) return false
  console.error(`Contrast floors not met${where}:\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(`\n${failures.length} pairing(s) failed. ${fix}`)
  return true
}

const library = measure(base)
const libraryFailed = report(
  '',
  'Move the token in src/styles/tokens.css until it' +
    `\nclears, and update the measured ratio in its comment. Re-run with --verbose to see` +
    `\nevery pairing.`,
  library,
)

const brandsDir = resolve(pkg, 'gallery/brands')
const names = (await readdir(brandsDir)).filter((name) => name.endsWith('.css')).sort()
const sheets = await Promise.all(
  names.map(async (sheet) => [sheet, parseBrandLayer(await readFile(resolve(brandsDir, sheet), 'utf8'))]),
)
const failedBrands = []
let gated = 0

for (const [sheet, brand] of sheets) {
  if (!declaresColor(brand)) continue
  gated += 1
  if (verbose) console.log(`\n  gallery/brands/${sheet}`)
  const failed = report(
    ` in gallery/brands/${sheet}`,
    'Move the value in the sheet until it clears, keeping' +
      `\nthe brand's hue, and update its ratio comment.`,
    measure(layer(base, brand)),
  )
  if (failed) failedBrands.push(sheet)
}

if (libraryFailed || failedBrands.length > 0) process.exit(1)

console.log(`contrast: clean (${library.count} pairings across both schemes)`)
console.log(`contrast: clean (${gated} gallery brand sheets, each layered on tokens.css)`)
