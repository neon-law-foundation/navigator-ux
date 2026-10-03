import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NAVIGATION_CHORDS,
  NavigationChords,
  NavigatorShell,
  ShortcutHost,
  ShortcutProvider,
  chordsFor,
  createShortcutRegistry,
} from '../index'

function key(registry: ReturnType<typeof createShortcutRegistry>, init: KeyboardEventInit & { key: string }, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(event, 'target', { value: target })
  return registry.handle(event)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('chords in the registry', () => {
  function setup() {
    const registry = createShortcutRegistry()
    const run = vi.fn()
    registry.register({ key: 'g m', description: 'matters', scope: 'global', run })
    return { registry, run }
  }

  it('fires on the second key and claims the first', () => {
    const { registry, run } = setup()
    expect(key(registry, { key: 'g' })).toBe(true)
    expect(run).not.toHaveBeenCalled()
    expect(key(registry, { key: 'm' })).toBe(true)
    expect(run).toHaveBeenCalledOnce()
  })

  it('times out after about a second and then reads the next key afresh', () => {
    const { registry, run } = setup()
    key(registry, { key: 'g' })
    act(() => {
      vi.advanceTimersByTime(999)
    })
    // Still pending a hair before the deadline.
    expect(key(registry, { key: 'g' })).toBe(true)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(key(registry, { key: 'm' })).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('drops the chord on any other key, which is then handled on its own', () => {
    const { registry, run } = setup()
    const other = vi.fn()
    registry.register({ key: 'x', description: 'x', scope: 'page', run: other })
    key(registry, { key: 'g' })
    expect(key(registry, { key: 'x' })).toBe(true)
    expect(other).toHaveBeenCalledOnce()
    expect(key(registry, { key: 'm' })).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('lets a chord restart when the interrupting key is itself a first key', () => {
    const { registry, run } = setup()
    key(registry, { key: 'g' })
    key(registry, { key: 'g' })
    key(registry, { key: 'm' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not treat a held modifier as the next key', () => {
    const { registry, run } = setup()
    key(registry, { key: 'g' })
    expect(key(registry, { key: 'Shift', shiftKey: true })).toBe(false)
    key(registry, { key: 'm' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('is not triggered by Shift+G or a modified g', () => {
    const { registry } = setup()
    expect(key(registry, { key: 'G', shiftKey: true })).toBe(false)
    expect(key(registry, { key: 'g', ctrlKey: true })).toBe(false)
  })

  it('never starts in a text field', () => {
    const { registry, run } = setup()
    const input = document.createElement('input')
    expect(key(registry, { key: 'g' }, input)).toBe(false)
    expect(key(registry, { key: 'm' }, input)).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('does not finish when focus moved into a text field mid-chord', () => {
    const { registry, run } = setup()
    const input = document.createElement('input')
    key(registry, { key: 'g' })
    expect(key(registry, { key: 'm' }, input)).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('forgets a pending chord when a shortcut is unregistered', () => {
    const registry = createShortcutRegistry()
    const run = vi.fn()
    const off = registry.register({ key: 'g m', description: 'm', scope: 'global', run })
    key(registry, { key: 'g' })
    off()
    registry.register({ key: 'g m', description: 'm', scope: 'global', run })
    expect(key(registry, { key: 'm' })).toBe(false)
  })

  it('honours a custom timeout', () => {
    const registry = createShortcutRegistry({ chordTimeoutMs: 50 })
    const run = vi.fn()
    registry.register({ key: 'g m', description: 'm', scope: 'global', run })
    key(registry, { key: 'g' })
    act(() => {
      vi.advanceTimersByTime(51)
    })
    expect(key(registry, { key: 'm' })).toBe(false)
  })
})

describe('the navigation chord map', () => {
  it('is g m, g n and g d, defined once', () => {
    expect(NAVIGATION_CHORDS.map((chord) => [chord.key, chord.page])).toEqual([
      ['g m', 'matters'],
      ['g n', 'notations'],
      ['g d', 'documents'],
    ])
  })

  it('leaves out the pages a portal does not have', () => {
    expect(chordsFor({ matters: '/m', documents: '/d' }).map((chord) => chord.key)).toEqual([
      'g m',
      'g d',
    ])
    expect(chordsFor({})).toEqual([])
  })

  it('navigates with the registered chord and lists only the pages it has', () => {
    const registry = createShortcutRegistry()
    const navigate = vi.fn()
    render(
      <ShortcutProvider registry={registry}>
        <NavigationChords hrefs={{ matters: '/app/projects', notations: '/app/notations' }} navigate={navigate} />
      </ShortcutProvider>,
    )
    expect(registry.list().map((entry) => entry.key)).toEqual(['g m', 'g n'])
    key(registry, { key: 'g' })
    key(registry, { key: 'n' })
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/app/notations')
  })

  it('goes through window.location when no navigate is given', () => {
    const registry = createShortcutRegistry()
    const assign = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true })
    try {
      render(
        <ShortcutProvider registry={registry}>
          <NavigationChords hrefs={{ matters: '/app/projects' }} />
        </ShortcutProvider>,
      )
      key(registry, { key: 'g' })
      key(registry, { key: 'm' })
      expect(assign).toHaveBeenCalledWith('/app/projects')
    } finally {
      Object.defineProperty(window, 'location', { value: original, configurable: true })
    }
  })

  it('shows up in the ? overlay as a global, with a then between its keys', async () => {
    vi.useRealTimers()
    const registry = createShortcutRegistry()
    render(
      <ShortcutProvider registry={registry}>
        <ShortcutHost />
        <NavigationChords hrefs={{ matters: '/m', documents: '/d' }} navigate={vi.fn()} />
      </ShortcutProvider>,
    )
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }))
    })
    const dialog = await screen.findByRole('dialog')
    const everywhere = within(within(dialog).getByRole('region', { name: 'Everywhere' }))
    expect(everywhere.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Show keyboard shortcuts',
      'Go to matters',
      'Go to documents',
    ])
    const row = everywhere.getByText('Go to matters').closest('div')!
    expect(row.textContent).toContain('G')
    expect(row.textContent).toContain('then')
    expect(row.querySelectorAll('kbd')).toHaveLength(2)
  })

  it('arrives through NavigatorShell with no per-page wiring', () => {
    render(
      <NavigatorShell chords={{ matters: '/m' }}>
        <p>Body</p>
      </NavigatorShell>,
    )
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }))
    })
    expect(screen.getByText('Go to matters')).toBeInTheDocument()
  })
})
