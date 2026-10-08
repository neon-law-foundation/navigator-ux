/*
 * Post-build: emit the `navigator-ux` CLI into `dist`.
 *
 * Copied, not bundled — see AGENTS.md. The CLI reads the library's tokens at
 * `../styles/tokens.css` from its own location, which is where they sit in
 * `src`, so `tokens.css` is copied to the same relative place.
 */

import { chmod, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const at = (...parts) => resolve(pkg, ...parts)

await mkdir(at('dist/cli'), { recursive: true })
await mkdir(at('dist/styles'), { recursive: true })

const modules = (await readdir(at('src/cli'))).filter((name) => name.endsWith('.mjs'))
await Promise.all(
  modules.map(async (name) => {
    await copyFile(at('src/cli', name), at('dist/cli', name))
    console.log(`emit: src/cli/${name} -> dist/cli/${name}`)
  }),
)

await copyFile(at('src/styles/tokens.css'), at('dist/styles/tokens.css'))
console.log('emit: src/styles/tokens.css -> dist/styles/tokens.css')

// The bin has to be what package.json says it is, and executable.
const manifest = JSON.parse(await readFile(at('package.json'), 'utf8'))
const bin = manifest.bin?.['navigator-ux']
if (!bin || !modules.includes(bin.replace(/^\.\/dist\/cli\//, ''))) {
  throw new Error(`package.json bin "navigator-ux" is ${bin}, which this step did not emit.`)
}
await chmod(at(bin), 0o755)
console.log(`emit: chmod 755 ${bin}`)
