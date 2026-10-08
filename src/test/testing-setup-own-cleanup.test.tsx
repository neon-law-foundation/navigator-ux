import { cleanup, render } from '@testing-library/react'

// A suite that already sets RTL_SKIP_AUTO_CLEANUP keeps its cleanup: the setup
// file must leave the variable, and the DOM, alone.
const env = vi.hoisted(() => {
  const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process!.env
  processEnv.RTL_SKIP_AUTO_CLEANUP = 'mine'
  return processEnv
})

await import('../testing/setup')

afterAll(() => {
  cleanup()
  delete env.RTL_SKIP_AUTO_CLEANUP
})

describe('navigator-ux testing setup, when the suite owns cleanup', () => {
  it('runs the checks without unmounting', () => {
    render(<button type="button">Save</button>)
  })

  it('leaves the previous render and the variable in place', () => {
    expect(document.body.childElementCount).toBe(1)
    expect(env.RTL_SKIP_AUTO_CLEANUP).toBe('mine')
  })
})
