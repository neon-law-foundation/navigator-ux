import { render } from '@testing-library/react'
import { onTestFinished } from 'vitest'
import '../testing/setup'
import { resetNavigatorTesting } from '../testing/checks'
import {
  allowAxeViolation,
  allowConsoleError,
  allowRequest,
  configureNavigatorTesting,
} from '../testing'

/*
 * The setup file's hooks govern every test here, so a test that should be
 * failed by them is written with `it.fails`: Vitest flips a test that fails in
 * its `afterEach` to a pass, and a clean one to a failure. Each half of every
 * check is therefore proved by the runner itself rather than by a mock of it.
 */

const respond = async () => new Response('{}')

/** Configure for one test; `onTestFinished` runs after the checks have judged it. */
function configureForThisTest(options: Parameters<typeof configureNavigatorTesting>[0]) {
  configureNavigatorTesting(options)
  onTestFinished(resetNavigatorTesting)
}

describe('navigator-ux testing setup', () => {
  it('passes an accessible render', () => {
    render(<button type="button">Save</button>)
  })

  it.fails('fails a render with an axe violation', () => {
    render(<button type="button" />)
  })

  it('excuses one axe rule for one test', () => {
    allowAxeViolation('button-name')
    render(<button type="button" />)
  })

  it('unmounts what the previous test rendered', () => {
    expect(document.body.childElementCount).toBe(0)
  })

  it.fails('fails on console.error', () => {
    console.error('Each child in a list should have a unique "key" prop.')
  })

  it('excuses a console.error by substring or pattern', () => {
    allowConsoleError('expected')
    allowConsoleError(/^Warning: formatted$/)
    console.error('an expected failure')
    console.error('Warning: %s', 'formatted')
  })

  it.fails('fails a fetch that leaves the origin', async () => {
    globalThis.fetch = respond
    await fetch('https://cdn.example.com/script.js')
  })

  it.fails('fails a same-origin fetch outside /app/api', async () => {
    globalThis.fetch = respond
    await fetch('/internal/report')
  })

  it.fails('reads the calls of a fetch replaced with vi.stubGlobal', async () => {
    vi.stubGlobal('fetch', vi.fn(respond))
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    await fetch(new URL('https://cdn.example.com/a.js'))
  })

  it('passes /app/api, the session endpoint, and data: URLs', async () => {
    globalThis.fetch = respond
    await fetch('/app/api/projects')
    await fetch(new Request(`${location.origin}/__session`))
    await fetch('data:text/plain,ok')
  })

  it('excuses a request for one test', async () => {
    allowRequest('/files/')
    globalThis.fetch = respond
    await fetch('/files/exhibit.pdf')
  })

  it('turns each check off for the suite', async () => {
    configureForThisTest({ axe: false, consoleErrors: false, network: false })
    render(<button type="button" />)
    console.error('not counted')
    globalThis.fetch = respond
    await fetch('https://cdn.example.com/x.js')
  })

  it('takes an allow-list and axe options', async () => {
    configureForThisTest({
      network: { allow: [/^https:\/\/tiles\./] },
      axe: { rules: { 'button-name': { enabled: false } } },
    })
    render(<button type="button" />)
    globalThis.fetch = respond
    await fetch('https://tiles.example.com/0/0/0.png')
  })

  it('rejects an excuse made outside a test', async () => {
    const { endTest, allowRequest: excuse } = await import('../testing/checks')
    await endTest()
    expect(() => excuse('/x')).toThrow(/only works inside a test/)
  })
})
