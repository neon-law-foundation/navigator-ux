/*
 * Gate: nothing in the built bundle reaches off-origin.
 *
 * Runs against `dist`, after the build. The rule and its allow-list are in
 * `src/cli/external-references.mjs`, shared with the `navigator-ux check` a
 * consumer runs against its own build.
 */

import { stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findExternalReferences } from '../src/cli/external-references.mjs'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(pkg, 'dist')

try {
  await stat(dist)
} catch {
  console.error(`no-external-references: ${relative(pkg, dist)} does not exist — run the build first.`)
  process.exit(1)
}

const { failures, scanned } = await findExternalReferences(dist, pkg)

if (failures.length > 0) {
  console.error('Off-origin references in the built bundle:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(
    `\n${failures.length} found. Vendor the asset into src/assets and reference it relatively,` +
      `\nor add the URL to ALLOWED in src/cli/external-references.mjs if it is genuinely an` +
      `\nidentifier and not a fetch.`,
  )
  process.exit(1)
}

console.log(`no-external-references: clean (${scanned} files scanned)`)
