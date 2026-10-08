import { render } from '@testing-library/react'
import {
  allowConsoleError,
  beginTest,
  configureNavigatorTesting,
  endTest,
  formatAxeViolations,
  formatConsoleArgs,
  offContract,
  resetNavigatorTesting,
} from '../testing/checks'
import { axeViolations, expectNoAxeViolations } from '../testing'

/* The checks driven by hand, without the setup file, so each failure message
 * can be read rather than only observed. */

afterEach(() => {
  resetNavigatorTesting()
  vi.unstubAllGlobals()
})

describe('expectNoAxeViolations', () => {
  it('passes accessible markup and names rule, impact, and selector otherwise', async () => {
    const { container } = render(
      <div>
        <button type="button">Save</button>
        <img src="seal.png" />
      </div>,
    )
    await expect(expectNoAxeViolations(container.querySelector('button')!)).resolves.toBeUndefined()

    const failure = expectNoAxeViolations(container)
    await expect(failure).rejects.toThrow(/\[critical\] image-alt/)
    await expect(failure).rejects.toThrow(/ — at img$/m)
  })

  it('defaults to document.body and takes axe options', async () => {
    render(<button type="button" />)
    await expect(expectNoAxeViolations()).rejects.toThrow(/button-name/)
    await expect(
      expectNoAxeViolations(document.body, { rules: { 'button-name': { enabled: false } } }),
    ).resolves.toBeUndefined()
    expect(await axeViolations(document.body)).toHaveLength(1)
  })

  it('formats a violation with no impact', () => {
    const text = formatAxeViolations([
      { id: 'x', impact: null, help: 'Help', helpUrl: 'about:blank', nodes: [{ target: ['p'] }] },
    ] as unknown as Parameters<typeof formatAxeViolations>[0])
    expect(text).toContain('[unknown] x: Help — at p')
  })

  it('says how to proceed when axe-core is missing', async () => {
    vi.resetModules()
    vi.doMock('axe-core', () => {
      throw new Error('Cannot find package')
    })
    try {
      const fresh = await import('../testing/checks')
      await expect(fresh.expectNoAxeViolations(document.body)).rejects.toThrow(
        /axe-core is not installed.*axe: false/s,
      )
    } finally {
      vi.doUnmock('axe-core')
      vi.resetModules()
    }
  })
})

describe('formatConsoleArgs', () => {
  it('substitutes the way the console does', () => {
    expect(formatConsoleArgs(['%s has %d items %c(styled) 100%%', 'list', 3, 'color: x', 'extra'])).toBe(
      'list has 3 items (styled) 100% extra',
    )
    expect(formatConsoleArgs(['missing %s'])).toBe('missing %s')
    expect(formatConsoleArgs([new Error('boom'), 2])).toBe('Error: boom 2')
  })
})

describe('offContract', () => {
  it('passes the contract and names what breaks it', () => {
    expect(offContract('/app/api')).toBeNull()
    expect(offContract('/app/api/people/1')).toBeNull()
    expect(offContract('/__session')).toBeNull()
    expect(offContract('blob:whatever')).toBeNull()
    expect(offContract('/app/apiary')).toMatch(/outside \/app\/api/)
    expect(offContract('//cdn.example.com/x.js')).toMatch(/leaves the page's origin/)
    expect(offContract('http://[')).toMatch(/is not a URL/)
    expect(offContract('https://cdn.example.com/x', ['https://cdn.example.com/'])).toBeNull()
  })

  it('resolves against a default origin where there is no location', () => {
    vi.stubGlobal('location', undefined)
    expect(offContract('/app/api/projects')).toBeNull()
    expect(offContract('http://localhost/elsewhere')).toMatch(/outside/)
  })
})

describe('beginTest and endTest', () => {
  it('report every problem in one error', async () => {
    beginTest()
    allowConsoleError('excused')
    console.error('excused one')
    console.error('a real one\nwith a stack')
    globalThis.fetch = async () => new Response('{}')
    await fetch('https://cdn.example.com/x.js')
    render(<button type="button" />)

    const failure = endTest()
    await expect(failure).rejects.toThrow(/console.error was called 1 time\(s\):\n\n {2}a real one\n\n/)
    await expect(failure).rejects.toThrow(/cdn\.example\.com\/x\.js leaves the page's origin/)
    await expect(failure).rejects.toThrow(/\[critical\] button-name/)
  })

  it('does nothing when no test was begun', async () => {
    await expect(endTest()).resolves.toBeUndefined()
  })

  it('observes nothing it cannot wrap', async () => {
    vi.stubGlobal('fetch', undefined)
    configureNavigatorTesting({ consoleErrors: false })
    beginTest()
    console.error('not observed')
    await expect(endTest()).resolves.toBeUndefined()
  })

  it('counts only the calls a pre-installed mock took during the test', async () => {
    const stub = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', stub)
    await fetch('https://cdn.example.com/before.js')

    beginTest()
    vi.stubGlobal('fetch', stub)
    await fetch('/app/api/projects')
    await expect(endTest()).resolves.toBeUndefined()

    beginTest()
    vi.stubGlobal('fetch', async () => new Response('{}'))
    await fetch('https://cdn.example.com/unobserved.js')
    await expect(endTest()).resolves.toBeUndefined()
  })
})
