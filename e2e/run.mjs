/*
 * Start the fake OpenAPI backend, the harness, and the gallery, then run
 * Cypress.
 *
 * All three servers are child processes of this script so a failed spec still
 * tears them down. Cypress is given the harness origin as baseUrl.
 * neon-site.cy.ts renders the public-site specimen on that same origin
 * (`/neon` or the legacy `?showcase=neon` query) against gallery/content.
 *
 * accessibility.cy.ts audits the gallery itself, on its own origin. It runs on
 * E2E_GALLERY_PORT rather than the gallery's usual 5174 so a `pnpm gallery`
 * left running does not collide with it (both are strictPort).
 */

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API_PORT = process.env.E2E_API_PORT ?? '4010'
const HARNESS_PORT = process.env.E2E_HARNESS_PORT ?? '5175'
const GALLERY_PORT = process.env.E2E_GALLERY_PORT ?? '5176'

function waitFor(url, { status = 200, timeoutMs = 30_000 } = {}) {
  const started = Date.now()
  return new Promise((resolveWait, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url)
        if (response.status === status) {
          resolveWait(undefined)
          return
        }
      } catch {
        // still booting
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`timed out waiting for ${url}`))
        return
      }
      setTimeout(() => void tick(), 200)
    }
    void tick()
  })
}

function child(command, args, extraEnv = {}) {
  const proc = spawn(command, args, {
    cwd: pkg,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
  return proc
}

const kids = []

function stop() {
  for (const proc of kids) {
    if (!proc.killed && proc.exitCode === null) proc.kill('SIGTERM')
  }
}

process.on('SIGINT', () => {
  stop()
  process.exit(130)
})

try {
  const mock = child(process.execPath, ['e2e/mock-api.mjs'], { E2E_API_PORT: API_PORT })
  kids.push(mock)
  const harness = child(
    'pnpm',
    ['exec', 'vite', '--config', 'e2e/vite.config.ts'],
    { E2E_API_PORT: API_PORT },
  )
  kids.push(harness)

  // The gallery's `pre*` hook, run by hand: the PdfViewer specimen loads a
  // generated PDF that is never committed.
  const specimens = child(process.execPath, ['scripts/generate-specimen-pdf.mjs'])
  const generated = await new Promise((resolveCode) => specimens.on('exit', resolveCode))
  if (generated !== 0) throw new Error('could not generate the gallery specimens')
  const gallery = child('pnpm', [
    'exec', 'vite', '--config', 'vite.gallery.config.ts',
    '--host', '127.0.0.1', '--port', GALLERY_PORT, '--strictPort',
  ])
  kids.push(gallery)

  await waitFor(`http://127.0.0.1:${API_PORT}/`)
  await waitFor(`http://127.0.0.1:${HARNESS_PORT}/`)
  await waitFor(`http://127.0.0.1:${GALLERY_PORT}/`)

  const cypress = child('pnpm', ['exec', 'cypress', 'run', ...process.argv.slice(2)], {
    CYPRESS_BASE_URL: `http://127.0.0.1:${HARNESS_PORT}`,
    CYPRESS_GALLERY_URL: `http://127.0.0.1:${GALLERY_PORT}`,
  })
  const code = await new Promise((resolveCode) => {
    cypress.on('exit', (exitCode) => resolveCode(exitCode ?? 1))
  })
  stop()
  process.exit(code)
} catch (error) {
  stop()
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
