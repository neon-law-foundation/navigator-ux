/*
 * Gate: prove the package's declaration graph works after packing.
 *
 * The source tree has the generated OpenAPI schema, but consumers resolve the
 * package through its tarball and its exports map. This check installs that
 * exact artifact into a clean temporary TypeScript consumer with no source
 * aliases, then checks both accepted and rejected API calls.
 */

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const scratch = await mkdtemp(join(tmpdir(), 'navigator-ux-packed-consumer-'))
const artifactDir = join(scratch, 'artifact')
const consumerDir = join(scratch, 'consumer')

await mkdir(artifactDir, { recursive: true })
await mkdir(consumerDir, { recursive: true })
const { stdout: packed } = await exec('pnpm', ['pack', '--pack-destination', artifactDir], { cwd: root })
const tarball = packed.trim().split('\n').at(-1)
if (!tarball) throw new Error('pnpm pack did not report a tarball')

await writeFile(
  join(consumerDir, 'package.json'),
  JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies: {
        '@neon-law-source-code/navigator-ux': `file:${tarball}`,
        '@types/react': '19.3.0',
        '@types/react-dom': '19.3.0',
        react: '19.3.0',
        'react-dom': '19.3.0',
        typescript: '5.9.3',
      },
    },
    null,
    2,
  ),
)

await writeFile(
  join(consumerDir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        noEmit: true,
        skipLibCheck: false,
        strict: true,
        target: 'ES2022',
      },
      files: ['consumer.ts'],
    },
    null,
    2,
  ),
)

await writeFile(
  join(consumerDir, 'consumer.ts'),
  `import { apiFetch } from '@neon-law-source-code/navigator-ux'
import type { ApiComponents, ApiPaths } from '@neon-law-source-code/navigator-ux'

const path: keyof ApiPaths = '/app/api/projects'
const role: ApiComponents['schemas']['PersonRole'] = 'client'
void path
void role

apiFetch('/app/api/projects', 'get')
apiFetch('/app/api/people', 'post', {
  body: { email: 'consumer@example.com', name: 'Example Consumer', role: 'client' },
})

// @ts-expect-error — the path is not in the OpenAPI snapshot.
apiFetch('/app/api/not-a-route', 'get')
// @ts-expect-error — GET is the only declared method for this path.
apiFetch('/app/api/projects', 'post')
// @ts-expect-error — CreatePersonRequest requires email and name.
apiFetch('/app/api/people', 'post', { body: { role: 'client' } })
// @ts-expect-error — PersonRole rejects arbitrary strings.
apiFetch('/app/api/people', 'post', { body: { email: 'consumer@example.com', name: 'Example Consumer', role: 'unknown' } })
`,
)

// A frozen install skips resolution, so the package mirror `--offline` reads
// can be empty even though every tarball is already in the store. Prefer the
// store, and fetch only that mirror when it is missing.
await exec('pnpm', ['install', '--prefer-offline', '--ignore-scripts'], { cwd: consumerDir })
await exec('pnpm', ['exec', 'tsc', '--project', 'tsconfig.json'], { cwd: consumerDir })

const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
console.log(`check:packed-consumer: ${manifest.name}@${manifest.version} typechecks from ${tarball}`)
