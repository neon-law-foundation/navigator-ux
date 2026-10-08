import { CHECKS, USAGE, main, parseArgs, runChecks, type CheckResult } from '../cli/check.mjs'
import { contrast, measure, parseBrandLayer, parseTokens } from '../cli/contrast.mjs'
import { findLiteralColors } from '../cli/literal-colors.mjs'
import { RELEASE_SPEC, makeConsumer, manifestWith, removeConsumer } from '../../fixtures/consumer.mjs'

/* Every check against a consuming repository built in a temp directory per
 * test, from the files named beside the assertion. */

const roots: string[] = []

async function consumer(files: Record<string, string>): Promise<string> {
  const root = await makeConsumer(files)
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(removeConsumer))
})

/** A consumer that passes everything, with `files` laid over it. */
const healthy = (files: Record<string, string> = {}) =>
  consumer({
    'package.json': manifestWith(RELEASE_SPEC),
    'src/main.tsx': "import '@neon-law-source-code/navigator-ux/styles.css'\n",
    ...files,
  })

async function run(root: string, ...flags: string[]) {
  const results = await runChecks(parseArgs(['check', '--cwd', root, ...flags]))
  return Object.fromEntries(results.map((result) => [result.name, result])) as Record<
    string,
    CheckResult
  >
}

/** A brand that clears in both schemes. */
const GOOD_BRAND = `:root:root {
  --nav-color-primary: #5b2a86;
  --nav-color-link: var(--brand-ink);
  --brand-ink: #5b2a86;
}
@media (prefers-color-scheme: dark) {
  :root:root { --nav-color-primary: #d7b8f3; --nav-color-link: #d7b8f3 }
}`

describe('parseArgs', () => {
  it('reads every option', () => {
    const options = parseArgs(['check', '--cwd', 'x', '--src', 'app', '--dist', 'out', '--portal', '--skip', 'manifest,bundle-origin', '--skip', 'brand-contrast'])
    expect(options).toMatchObject({ command: 'check', cwd: 'x', src: 'app', dist: 'out', portal: true })
    expect([...options.skip]).toEqual(['manifest', 'bundle-origin', 'brand-contrast'])
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it.each([
    [[], /No command given/],
    [['lint'], /Unknown command: lint/],
    [['check', '--bogus'], /Unknown argument: --bogus/],
    [['check', '--cwd'], /--cwd needs a value/],
    [['check', '--skip', '--portal'], /--skip needs a value/],
    [['check', '--skip', 'nope'], /--skip nope: no such check/],
  ])('rejects %j', (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message)
  })
})

describe('main', () => {
  const io = () => {
    const out: string[] = []
    const err: string[] = []
    return { out, err, io: { out: (line: string) => out.push(line), err: (line: string) => err.push(line) } }
  }

  it('prints usage for --help and exits 0', async () => {
    const { out, io: sink } = io()
    expect(await main(['--help'], sink)).toBe(0)
    expect(out).toEqual([USAGE])
  })

  it('exits 2 on a usage error', async () => {
    const { err, io: sink } = io()
    expect(await main(['check', '--nope'], sink)).toBe(2)
    expect(err[0]).toMatch(/^navigator-ux: Unknown argument: --nope/)
  })

  it('prints one line per check and exits 0 when clean', async () => {
    const root = await healthy()
    const { out, err, io: sink } = io()
    expect(await main(['check', '--cwd', root], sink)).toBe(0)
    expect(err).toEqual([])
    expect(out.slice(0, -1).map((line) => line.split(/\s+/)[1])).toEqual(
      CHECKS.filter((name) => name !== 'portal-no-repaint'),
    )
    expect(out.at(-1)).toMatch(/clean\.$/)
  })

  it('prints failures with their detail to stderr and exits 1', async () => {
    const root = await healthy({ 'package.json': manifestWith('link:../navigator-ux') })
    const { err, io: sink } = io()
    expect(await main(['check', '--cwd', root, '--skip', 'bundle-origin'], sink)).toBe(1)
    expect(err[0]).toMatch(/^FAIL {2}manifest/)
    expect(err[1]).toMatch(/a link: spec/)
    expect(err.at(-1)).toMatch(/1 of 5 checks failed/)
  })

  it('runs as the package bin', async () => {
    type Proc = { argv: string[]; exitCode?: number; stdout: { write: (text: string) => boolean } }
    const proc = (globalThis as unknown as { process: Proc }).process
    const [argv, exitCode] = [proc.argv, proc.exitCode]
    const write = vi.spyOn(proc.stdout, 'write').mockImplementation(() => true)
    proc.argv = ['node', 'navigator-ux', '--help']
    try {
      await import('../cli/navigator-ux.mjs')
      expect(proc.exitCode).toBe(0)
      expect(write).toHaveBeenCalledWith(`${USAGE}\n`)
    } finally {
      proc.argv = argv
      proc.exitCode = exitCode
      write.mockRestore()
    }
  })
})

describe('manifest', () => {
  it('passes a release tarball in any dependency field', async () => {
    expect((await run(await healthy())).manifest?.status).toBe('pass')
    const dev = await healthy({ 'package.json': manifestWith(RELEASE_SPEC, 'devDependencies') })
    expect((await run(dev)).manifest?.status).toBe('pass')
  })

  it.each([
    ['link:../navigator-ux', /a link: spec/],
    ['workspace:*', /a workspace: spec/],
    ['github:neon-law-source-code/navigator-ux', /a github: spec/],
    [RELEASE_SPEC.replace('navigator-ux-v26.10.8', 'navigator-ux-v26.10.7'), /tag and the tarball name disagree/],
    ['^26.10.8', /not a release tarball URL/],
    [{ version: '1' }, /not a release tarball URL/],
  ])('fails %j', async (spec, why) => {
    const result = (await run(await healthy({ 'package.json': manifestWith(spec) }))).manifest!
    expect(result.status).toBe('fail')
    expect(result.details[0]).toMatch(why)
    expect(result.details.at(-1)).toMatch(/^Expected https:/)
  })

  it('fails a link: left behind in pnpm.overrides', async () => {
    const pkg = {
      dependencies: { '@neon-law-source-code/navigator-ux': RELEASE_SPEC },
      pnpm: { overrides: { '@neon-law-source-code/navigator-ux': 'link:../navigator-ux' } },
    }
    const result = (await run(await healthy({ 'package.json': JSON.stringify(pkg) }))).manifest!
    expect(result.details[0]).toMatch(/^pnpm\.overrides: "link:/)
  })

  it('fails a repository that does not depend on the library, or has no manifest', async () => {
    const none = await healthy({ 'package.json': JSON.stringify({ dependencies: {} }) })
    expect((await run(none)).manifest?.summary).toMatch(/does not depend on/)
    const broken = await healthy({ 'package.json': '{' })
    expect((await run(broken)).manifest?.summary).toMatch(/cannot read package\.json/)
  })
})

describe('stylesheet-imported', () => {
  it('passes a JS import or a CSS @import, and fails without either', async () => {
    expect((await run(await healthy()))['stylesheet-imported']?.summary).toMatch(/src\/main\.tsx imports/)

    const css = await consumer({
      'package.json': manifestWith(RELEASE_SPEC),
      'src/app.css': '@import url("@neon-law-source-code/navigator-ux/styles.css");\n',
    })
    expect((await run(css))['stylesheet-imported']?.status).toBe('pass')

    const none = await consumer({
      'package.json': manifestWith(RELEASE_SPEC),
      'src/main.tsx': "// import '@neon-law-source-code/navigator-ux/styles.cssx'\n",
    })
    expect((await run(none))['stylesheet-imported']?.status).toBe('fail')
  })

  it('fails every source check when there is no source directory', async () => {
    const root = await consumer({ 'package.json': manifestWith(RELEASE_SPEC) })
    const results = await run(root, '--portal')
    for (const name of ['stylesheet-imported', 'portal-no-repaint', 'no-literal-colors']) {
      expect(results[name]?.summary).toMatch(/no source directory at src/)
    }
    expect(results['brand-contrast']?.status).toBe('pass')
  })
})

describe('brand-contrast', () => {
  it('passes with no brand layer, or a font-only one', async () => {
    const root = await healthy({ 'src/brand.css': ":root:root { --nav-font-family: serif; }\n" })
    expect((await run(root))['brand-contrast']?.summary).toMatch(/no brand layer/)
  })

  it('passes a brand that clears in both schemes', async () => {
    const root = await healthy({ 'src/styles/brand.css': GOOD_BRAND })
    expect((await run(root))['brand-contrast']).toMatchObject({
      status: 'pass',
      summary: expect.stringMatching(/\d+ pairings clear .* src\/styles\/brand\.css/),
    })
  })

  it('fails a brand with no dark block, in the dark scheme', async () => {
    const root = await healthy({ 'src/brand.css': ':root:root { --nav-color-primary: #4a1d6e; }' })
    const result = (await run(root))['brand-contrast']!
    expect(result.status).toBe('fail')
    expect(result.details.every((line) => line.startsWith('dark: '))).toBe(true)
    expect(result.details).toContainEqual(
      expect.stringMatching(/^dark: --nav-color-primary on --nav-color-bg is [\d.]+:1, under its 4\.5:1 floor\.$/),
    )
  })

  it('merges several sheets in path order, and reports a value it cannot read', async () => {
    const root = await healthy({
      'src/a.css': GOOD_BRAND,
      'src/b.css': ':root:root { --nav-color-focus: color-mix(in srgb, red, blue); }',
    })
    const result = (await run(root))['brand-contrast']!
    expect(result.summary).toMatch(/with src\/a\.css, src\/b\.css$/)
    expect(result.details[0]).toMatch(/--nav-color-focus on --nav-color-bg cannot be measured: cannot read/)
  })
})

describe('portal-no-repaint', () => {
  it('runs only under --portal, and fails any --nav-* redeclaration', async () => {
    const root = await healthy({
      'src/portal.css': '/* --nav-color-primary: is prose */\n.card {\n  --nav-radius-md: 0;\n}\n',
    })
    expect((await run(root))['portal-no-repaint']).toBeUndefined()
    const result = (await run(root, '--portal'))['portal-no-repaint']!
    expect(result.status).toBe('fail')
    expect(result.details).toEqual(['src/portal.css:3  --nav-radius-md'])
  })

  it('passes a portal that wears the palette as shipped', async () => {
    const root = await healthy({ 'src/portal.css': '.card { color: var(--nav-color-text); }' })
    expect((await run(root, '--portal'))['portal-no-repaint']?.status).toBe('pass')
  })
})

describe('no-literal-colors', () => {
  it('fails a literal in component source and exempts brand layers and tests', async () => {
    const root = await healthy({
      'src/Badge.tsx': "export const Badge = () => <b style={{ color: '#ff0000' }}>&#8249;</b>\n",
      'src/brand.css': GOOD_BRAND,
      'src/Badge.test.tsx': "expect(color).toBe('#ff0000')\n",
      'src/__tests__/x.ts': "const c = 'red'\n",
      'src/notes.md': '#ff0000\n',
    })
    const result = (await run(root))['no-literal-colors']!
    expect(result.status).toBe('fail')
    expect(result.details).toEqual(['src/Badge.tsx:1  hex color: #ff0000'])
  })

  it('passes clean source', async () => {
    const root = await healthy({ 'src/app.css': '.x { color: var(--nav-color-text); }' })
    expect((await run(root))['no-literal-colors']?.summary).toBe('2 files scanned')
  })
})

describe('bundle-origin', () => {
  it('skips with a notice when there is no build', async () => {
    expect((await run(await healthy()))['bundle-origin']).toMatchObject({
      status: 'skip',
      summary: 'no dist directory; build first to check it',
    })
  })

  it('fails an off-origin reference and passes a clean build', async () => {
    const root = await healthy({
      'build/index.html': '<link rel="stylesheet" href="https://fonts.example.com/a.css">\n',
      'build/app.js.map': '"https://cdn.example.com"',
      'build/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    const result = (await run(root, '--dist', 'build'))['bundle-origin']!
    expect(result.details).toEqual(['build/index.html:1  https://fonts.example.com/a.css'])

    const clean = await healthy({ 'dist/index.html': '<script src="./app.js"></script>\n' })
    expect((await run(clean))['bundle-origin']?.summary).toBe('1 files in dist scanned')
  })
})

it('skips a check by name', async () => {
  const root = await healthy({ 'package.json': manifestWith('link:x') })
  expect((await run(root, '--skip', 'manifest')).manifest).toMatchObject({
    status: 'skip',
    summary: 'skipped by --skip',
  })
})

describe('the shared modules', () => {
  const tokens = `:root { --nav-color-bg: #fff; --nav-color-text: var(--nav-color-ink); --nav-color-ink: #000;
    --nav-color-loop: var(--nav-color-loop); --nav-color-wash: rgba(0, 0, 0, 0.5); }
    @media (prefers-color-scheme: dark) { :root { --nav-color-bg: #000; --nav-color-text: #fff; } }`

  it('resolves aliases, composites translucency, and names what it cannot measure', () => {
    const { light, dark } = parseTokens(tokens)
    expect(contrast(light, '--nav-color-text', '--nav-color-bg')).toBeCloseTo(21)
    expect(contrast(dark, '--nav-color-text', '--nav-color-bg')).toBeCloseTo(21)
    expect(contrast(light, '--nav-color-wash', '--nav-color-bg')).toBeGreaterThan(3)
    expect(() => contrast(light, '--nav-color-loop', '--nav-color-bg')).toThrow(/cycle/)
    expect(() => contrast(light, '--nav-color-none', '--nav-color-bg')).toThrow(/not declared/)
    expect(() => contrast(new Map([['--nav-color-bg', 'rgba(0,0,0,.5)']]), '--nav-color-bg', '--nav-color-bg')).toThrow(/needs a backdrop/)
    expect(measure(parseTokens(tokens)).failures.length).toBeGreaterThan(0)
  })

  it('requires a dark block in the library tokens', () => {
    expect(() => parseTokens(':root { --nav-color-bg: #fff; }')).toThrow(/no dark-scheme block/)
  })

  it('reads a brand layer nested either way, and ignores a plain :root', () => {
    const layer = parseBrandLayer(`
      :root { --nav-color-primary: #111; }
      :root:root { @media (prefers-color-scheme: dark) { --nav-color-primary: #eee } }
      html:root:root, :root:root { --nav-color-link: #222 }`)
    expect(layer.light).toEqual(new Map([['--nav-color-link', '#222']]))
    expect(layer.dark).toEqual(new Map([['--nav-color-primary', '#eee']]))
  })

  it('does not read a numeric character reference or a comment as a color', () => {
    expect(findLiteralColors('/* #fff */ // red\nconst a = "&#8249;"', '.tsx', 'a.tsx')).toEqual([])
    expect(findLiteralColors('a { b: url(//x.example/y) } /* #fff */', '.css', 'a.css')).toEqual([])
  })
})
