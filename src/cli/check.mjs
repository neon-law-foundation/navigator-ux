/*
 * `navigator-ux check`: the library's own gates, run against a consumer.
 *
 * A Project portal installs this library from a release tarball and then
 * writes CSS and components of its own. The gates that keep the library honest
 * — contrast, literal colors, off-origin references — say nothing about that
 * code unless something runs them there, and a gate that has to be copied into
 * every repository is a gate that drifts in every repository. So the CLI ships
 * in `dist` and reads the same modules `scripts/` does.
 *
 * Every check reports one line, and every check can be skipped by name, so a
 * consumer is never forced to delete the script to get a release out.
 * Types are in `check.d.mts`.
 */

import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { declaresColor, layer, measure, parseBrandLayer, parseTokens } from './contrast.mjs'
import { findExternalReferences } from './external-references.mjs'
import { SCANNED_EXTENSIONS, findLiteralColors, walk } from './literal-colors.mjs'

export const PACKAGE = '@neon-law-source-code/navigator-ux'
const STYLESHEET = `${PACKAGE}/styles.css`

/** The order checks run and print in. `portal-no-repaint` runs only under `--portal`. */
export const CHECKS = [
  'manifest',
  'stylesheet-imported',
  'brand-contrast',
  'portal-no-repaint',
  'no-literal-colors',
  'bundle-origin',
]

/** The library's shipped tokens: `dist/styles/tokens.css` beside `dist/cli/`, and the same path in `src`. */
const DEFAULT_TOKENS = resolve(dirname(fileURLToPath(import.meta.url)), '../styles/tokens.css')

export const USAGE = `Usage: navigator-ux check [options]

Runs the library's gates against a consuming repository.

Options:
  --cwd <dir>     The repository to check (default: the current directory)
  --src <dir>     Its source directory, relative to --cwd (default: src)
  --dist <dir>    Its build output, relative to --cwd (default: dist)
  --portal        A Project portal: also fail on any --nav-* redeclaration
  --skip <name>   Skip a check; repeat or comma-separate for several
  -h, --help      Show this message

Checks: ${CHECKS.join(', ')}`

export class UsageError extends Error {}

/** argv after the program name, to options. Throws `UsageError` on anything it does not know. */
export function parseArgs(argv) {
  const options = { command: undefined, cwd: '.', src: 'src', dist: 'dist', portal: false, skip: new Set(), help: false }
  const value = (flag, i) => {
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) throw new UsageError(`${flag} needs a value.`)
    return next
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') options.help = true
    else if (arg === '--portal') options.portal = true
    else if (arg === '--cwd' || arg === '--src' || arg === '--dist') {
      options[arg.slice(2)] = value(arg, i)
      i += 1
    } else if (arg === '--skip') {
      for (const name of value(arg, i).split(',').filter(Boolean)) {
        if (!CHECKS.includes(name)) throw new UsageError(`--skip ${name}: no such check.`)
        options.skip.add(name)
      }
      i += 1
    } else if (!arg.startsWith('-') && options.command === undefined) options.command = arg
    else throw new UsageError(`Unknown argument: ${arg}`)
  }

  if (!options.help && options.command !== 'check') {
    throw new UsageError(options.command ? `Unknown command: ${options.command}` : 'No command given.')
  }
  return options
}

/* ----------------------------------------------------------- the checks -- */

const pass = (summary) => ({ status: 'pass', summary, details: [] })
const fail = (summary, details = []) => ({ status: 'fail', summary, details })
const skip = (summary) => ({ status: 'skip', summary, details: [] })

const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  )

const posix = (path) => path.split('\\').join('/')

/** Every file under the consumer's source directory, read once and shared by the checks. */
async function sourceFiles(context) {
  context.files ??= (async () => {
    if (!(await exists(context.srcDir))) return null
    const files = []
    for await (const file of walk(context.srcDir)) {
      files.push({ path: file, rel: posix(relative(context.root, file)), ext: extname(file), text: await readFile(file, 'utf8') })
    }
    return files.sort((a, b) => a.rel.localeCompare(b.rel))
  })()
  return context.files
}

const noSource = (context) => fail(`no source directory at ${posix(relative(context.root, context.srcDir)) || '.'}`)

/** CSS files under src that declare palette tokens on `:root:root`. */
async function brandLayers(context) {
  const files = (await sourceFiles(context)) ?? []
  return files
    .filter((file) => file.ext === '.css')
    .map((file) => ({ rel: file.rel, brand: parseBrandLayer(file.text) }))
    .filter((file) => declaresColor(file.brand))
}

const RELEASE_URL =
  /^https:\/\/github\.com\/neon-law-source-code\/navigator-ux\/releases\/download\/v([^/]+)\/navigator-ux-v([^/]+)\.tgz$/

async function manifest(context) {
  const path = join(context.root, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    return fail(`cannot read package.json: ${error.message}`)
  }

  const specs = []
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    if (pkg[field]?.[PACKAGE] !== undefined) specs.push([field, pkg[field][PACKAGE]])
  }
  // An override is where a `link:` survives after the dependency itself was put back.
  for (const field of ['overrides', 'resolutions']) {
    if (pkg[field]?.[PACKAGE] !== undefined) specs.push([field, pkg[field][PACKAGE]])
  }
  if (pkg.pnpm?.overrides?.[PACKAGE] !== undefined) specs.push(['pnpm.overrides', pkg.pnpm.overrides[PACKAGE]])

  if (specs.length === 0) return fail(`package.json does not depend on ${PACKAGE}`)

  const details = []
  for (const [field, spec] of specs) {
    const match = typeof spec === 'string' ? spec.match(RELEASE_URL) : null
    if (match && match[1] === match[2]) continue
    const kind = typeof spec === 'string' ? spec.match(/^(link|workspace|github|file|git\+[a-z]+|git):/)?.[1] : undefined
    const why = kind
      ? `a ${kind}: spec resolves somewhere other than a release`
      : match
        ? 'the tag and the tarball name disagree'
        : 'not a release tarball URL'
    details.push(`${field}: ${JSON.stringify(spec)} — ${why}`)
  }

  if (details.length === 0) return pass(`${PACKAGE} is a release tarball`)
  details.push(
    'Expected https://github.com/neon-law-source-code/navigator-ux/releases/download/v<version>/navigator-ux-v<version>.tgz',
  )
  return fail(`${details.length - 1} spec(s) for ${PACKAGE} are not a release tarball`, details)
}

const IMPORTS_STYLESHEET = new RegExp(
  String.raw`(?:^|[\s;])@?import\s*(?:url\(\s*)?['"]${STYLESHEET.replace(/[./]/g, '\\$&')}['"]`,
  'm',
)

async function stylesheetImported(context) {
  const files = await sourceFiles(context)
  if (!files) return noSource(context)
  const importer = files.find((file) => IMPORTS_STYLESHEET.test(file.text))
  return importer
    ? pass(`${importer.rel} imports ${STYLESHEET}`)
    : fail(`nothing under ${posix(relative(context.root, context.srcDir))} imports ${STYLESHEET}`, [
        'Without it every component renders unstyled. Import it once, ahead of your own CSS.',
      ])
}

async function brandContrast(context) {
  const layers = await brandLayers(context)
  if (layers.length === 0) return pass('no brand layer; the library palette is gated upstream')

  // Several sheets merge in path order: the cascade among equal specificity is
  // source order, which a static read cannot know, and path order is the
  // usual import order.
  const brand = { light: new Map(), dark: new Map() }
  for (const file of layers) {
    for (const scheme of ['light', 'dark']) {
      for (const [name, value] of file.brand[scheme]) brand[scheme].set(name, value)
    }
  }

  const base = parseTokens(await readFile(context.tokensPath, 'utf8'))
  const { failures, count } = measure(layer(base, brand))
  const from = layers.map((file) => file.rel).join(', ')
  return failures.length === 0
    ? pass(`${count} pairings clear their floors with ${from}`)
    : fail(`${failures.length} of ${count} pairings under their floor with ${from}`, failures)
}

async function portalNoRepaint(context) {
  const files = await sourceFiles(context)
  if (!files) return noSource(context)
  const details = []
  for (const file of files.filter((candidate) => candidate.ext === '.css')) {
    const css = file.text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    for (const match of css.matchAll(/(--nav-[\w-]+)\s*:/g)) {
      const line = css.slice(0, match.index).split('\n').length
      details.push(`${file.rel}:${line}  ${match[1]}`)
    }
  }
  return details.length === 0
    ? pass('no --nav-* token is redeclared')
    : fail(`${details.length} --nav-* redeclaration(s); a portal wears the library palette as shipped`, details)
}

/** Tests assert on color strings; that is not shipping a color. */
const isTest = (rel) => /(^|\/)(test|tests|__tests__)\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)

async function noLiteralColors(context) {
  const files = await sourceFiles(context)
  if (!files) return noSource(context)
  // A brand layer is where color is defined, so it is the token layer here.
  // Under `--portal` there should be none, and `portal-no-repaint` says so.
  const tokenLayer = new Set((await brandLayers(context)).map((file) => file.rel))
  const details = []
  let scanned = 0
  for (const file of files) {
    if (!SCANNED_EXTENSIONS.includes(file.ext) || tokenLayer.has(file.rel) || isTest(file.rel)) continue
    scanned += 1
    details.push(...findLiteralColors(file.text, file.ext, file.rel))
  }
  return details.length === 0
    ? pass(`${scanned} files scanned`)
    : fail(`${details.length} literal color(s); route each through a --nav-* custom property`, details)
}

async function bundleOrigin(context) {
  const shown = posix(relative(context.root, context.distDir)) || '.'
  if (!(await exists(context.distDir))) return skip(`no ${shown} directory; build first to check it`)
  const { failures, scanned } = await findExternalReferences(context.distDir, context.root)
  return failures.length === 0
    ? pass(`${scanned} files in ${shown} scanned`)
    : fail(`${failures.length} off-origin reference(s) in ${shown}`, failures)
}

const RUNNERS = {
  manifest,
  'stylesheet-imported': stylesheetImported,
  'brand-contrast': brandContrast,
  'portal-no-repaint': portalNoRepaint,
  'no-literal-colors': noLiteralColors,
  'bundle-origin': bundleOrigin,
}

/* -------------------------------------------------------------- running -- */

/** Run the checks `options` selects; each result is `{ name, status, summary, details }`. */
export async function runChecks(options, { tokensPath = DEFAULT_TOKENS } = {}) {
  const root = resolve(options.cwd)
  const within = (dir) => (isAbsolute(dir) ? dir : join(root, dir))
  const context = { root, srcDir: within(options.src), distDir: within(options.dist), tokensPath }
  const selected = CHECKS.filter((name) => name !== 'portal-no-repaint' || options.portal)
  return Promise.all(
    selected.map(async (name) => {
      const { status, summary, details } = options.skip.has(name)
        ? skip('skipped by --skip')
        : await RUNNERS[name](context)
      return { name, status, summary, details }
    }),
  )
}

/** The whole program: argv in, exit code out. `io` is where it writes. */
export async function main(argv, io, settings) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    if (!(error instanceof UsageError)) throw error
    io.err(`navigator-ux: ${error.message}\n\n${USAGE}`)
    return 2
  }
  if (options.help) {
    io.out(USAGE)
    return 0
  }

  const results = await runChecks(options, settings)
  const width = Math.max(...results.map((result) => result.name.length))
  for (const { name, status, summary, details } of results) {
    const line = `${status === 'fail' ? 'FAIL' : status}  ${name.padEnd(width)}  ${summary}`
    if (status === 'fail') {
      io.err(line)
      for (const detail of details) io.err(`        ${detail}`)
    } else io.out(line)
  }

  const failed = results.filter((result) => result.status === 'fail').length
  if (failed > 0) {
    io.err(`\nnavigator-ux check: ${failed} of ${results.length} checks failed.`)
    return 1
  }
  io.out(`\nnavigator-ux check: clean.`)
  return 0
}
