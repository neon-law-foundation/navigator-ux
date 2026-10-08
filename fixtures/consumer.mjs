/*
 * A throwaway consuming repository, written to a temp directory at test time.
 *
 * The CLI's checks read a consumer's files from disk, so their tests need a
 * disk. Building the tree per test from a map of paths to text keeps every
 * fixture visible beside the assertion it serves and leaves nothing in git.
 * Plain JavaScript because the suite has no Node types in scope; types are in
 * `consumer.d.mts`.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** A temp directory holding `files`, as `{ 'src/app.css': '…' }`. */
export async function makeConsumer(files) {
  const root = await mkdtemp(join(tmpdir(), 'navigator-ux-consumer-'))
  await Promise.all(
    Object.entries(files).map(async ([path, text]) => {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), text)
    }),
  )
  return root
}

export async function removeConsumer(root) {
  await rm(root, { recursive: true, force: true })
}

/** A `package.json` whose library dependency is `spec`. */
export function manifestWith(spec, field = 'dependencies') {
  return JSON.stringify({ private: true, [field]: { '@neon-law-source-code/navigator-ux': spec } })
}

export const RELEASE_SPEC =
  'https://github.com/neon-law-source-code/navigator-ux/releases/download/v26.10.8/navigator-ux-v26.10.8.tgz'
