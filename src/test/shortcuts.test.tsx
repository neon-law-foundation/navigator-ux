import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NavigatorShell } from '../components/Chrome'
import {
  ShortcutHost,
  ShortcutProvider,
  useShortcut,
} from '../components/Shortcuts'
import {
  createShortcutRegistry,
  formatKey,
  isEditableTarget,
  matchesKey,
  parseKey,
} from '../lib/shortcuts'

function press(init: KeyboardEventInit & { key: string }, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

describe('key notation', () => {
  it('parses modifiers and the key', () => {
    expect(parseKey('Mod+Enter')).toEqual({ mod: true, alt: false, shift: false, key: 'Enter' })
    expect(parseKey('Alt+ArrowLeft')).toMatchObject({ alt: true, key: 'ArrowLeft' })
    expect(parseKey('?')).toMatchObject({ key: '?', mod: false })
    expect(parseKey('+')).toMatchObject({ key: '+' })
  })

  it('refuses an unknown modifier', () => {
    expect(() => parseKey('Hyper+x')).toThrow(/Unknown modifier/)
  })

  it('matches Mod against either Meta or Ctrl, and a bare key against neither', () => {
    const ctrl = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true })
    const meta = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true })
    const bare = new KeyboardEvent('keydown', { key: 'Enter' })
    expect(matchesKey('Mod+Enter', ctrl)).toBe(true)
    expect(matchesKey('Mod+Enter', meta)).toBe(true)
    expect(matchesKey('Mod+Enter', bare)).toBe(false)
    expect(matchesKey('Enter', ctrl)).toBe(false)
  })

  it('lets a printable key carry its own Shift, and a named key not', () => {
    expect(matchesKey('?', new KeyboardEvent('keydown', { key: '?', shiftKey: true }))).toBe(true)
    expect(matchesKey('Enter', new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))).toBe(
      false,
    )
    expect(matchesKey('Alt+ArrowLeft', new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe(
      false,
    )
  })

  it('labels keys for the reader’s platform', () => {
    expect(formatKey('Mod+Enter', 'MacIntel')).toEqual(['⌘', 'Enter'])
    expect(formatKey('Mod+Enter', 'Win32')).toEqual(['Ctrl', 'Enter'])
    expect(formatKey('Alt+ArrowLeft', 'Win32')).toEqual(['Alt', '←'])
    expect(formatKey('?', 'Win32')).toEqual(['?'])
  })
})

describe('isEditableTarget', () => {
  it('is true for text controls and contenteditable, false for everything else', () => {
    const text = document.createElement('input')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const area = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const button = document.createElement('button')
    expect(isEditableTarget(text)).toBe(true)
    expect(isEditableTarget(area)).toBe(true)
    expect(isEditableTarget(select)).toBe(true)
    expect(isEditableTarget(editable)).toBe(true)
    expect(isEditableTarget(checkbox)).toBe(false)
    expect(isEditableTarget(button)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget(document)).toBe(false)
  })
})

describe('createShortcutRegistry', () => {
  it('lists registrations global-first and drops one on unregister', () => {
    const registry = createShortcutRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)
    const offPage = registry.register({ key: 'x', description: 'Page x', scope: 'page', run: vi.fn() })
    registry.register({ key: 'y', description: 'Global y', scope: 'global', run: vi.fn() })
    expect(registry.list().map((entry) => entry.description)).toEqual(['Global y', 'Page x'])
    offPage()
    offPage()
    expect(registry.list().map((entry) => entry.key)).toEqual(['y'])
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('runs the matching shortcut, prevents default, and reports it handled', () => {
    const registry = createShortcutRegistry()
    const run = vi.fn()
    registry.register({ key: 'x', description: 'x', scope: 'page', run })
    const event = new KeyboardEvent('keydown', { key: 'x', cancelable: true })
    expect(registry.handle(event)).toBe(true)
    expect(run).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
    expect(registry.handle(new KeyboardEvent('keydown', { key: 'z' }))).toBe(false)
  })

  it('lets the newest registration shadow an older one on the same key', () => {
    const registry = createShortcutRegistry()
    const older = vi.fn()
    const newer = vi.fn()
    registry.register({ key: 'x', description: 'a', scope: 'global', run: older })
    registry.register({ key: 'x', description: 'b', scope: 'page', run: newer })
    registry.handle(new KeyboardEvent('keydown', { key: 'x' }))
    expect(newer).toHaveBeenCalledOnce()
    expect(older).not.toHaveBeenCalled()
  })

  it('skips a bare key in a text field unless the shortcut opts in', () => {
    const registry = createShortcutRegistry()
    const bare = vi.fn()
    const modified = vi.fn()
    registry.register({ key: '1', description: 'one', scope: 'page', run: bare })
    registry.register({
      key: 'Mod+Enter',
      description: 'go',
      scope: 'page',
      allowInEditable: true,
      run: modified,
    })
    const input = document.createElement('input')
    document.body.append(input)
    const one = new KeyboardEvent('keydown', { key: '1', bubbles: true })
    input.dispatchEvent(one)
    expect(registry.handle(Object.defineProperty(one, 'target', { value: input }))).toBe(false)
    const go = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true })
    expect(registry.handle(Object.defineProperty(go, 'target', { value: input }))).toBe(true)
    expect(bare).not.toHaveBeenCalled()
    expect(modified).toHaveBeenCalledOnce()
    input.remove()
  })

  it('ignores an event something else already handled', () => {
    const registry = createShortcutRegistry()
    const run = vi.fn()
    registry.register({ key: 'x', description: 'x', scope: 'page', run })
    const event = new KeyboardEvent('keydown', { key: 'x', cancelable: true })
    event.preventDefault()
    expect(registry.handle(event)).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a registration whose key cannot be parsed', () => {
    expect(() =>
      createShortcutRegistry().register({ key: 'Hyper+x', description: 'x', scope: 'page', run: vi.fn() }),
    ).toThrow(/Unknown modifier/)
  })
})

function Harness({ registry, children }: { registry: ReturnType<typeof createShortcutRegistry>; children?: React.ReactNode }) {
  return (
    <ShortcutProvider registry={registry}>
      <button type="button">Before</button>
      <input aria-label="Notes" />
      <ShortcutHost />
      {children}
    </ShortcutProvider>
  )
}

function PageShortcuts({ onRun }: { onRun: () => void }) {
  useShortcut({ key: 'n', description: 'Next thing', scope: 'page', run: onRun })
  return null
}

describe('the ? overlay', () => {
  it('opens on ? as a labelled modal dialog and closes on Esc', async () => {
    const registry = createShortcutRegistry()
    render(<Harness registry={registry} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    press({ key: '?', shiftKey: true })
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(dialog.tagName).toBe('DIALOG')
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on an Escape keydown even where no native cancel arrives', async () => {
    render(<Harness registry={createShortcutRegistry()} />)
    press({ key: '?', shiftKey: true })
    await screen.findByRole('dialog')
    press({ key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the dialog with showModal, which is what traps focus and inerts the page', () => {
    const proto = window.HTMLDialogElement.prototype
    const original = proto.showModal
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    proto.showModal = showModal
    try {
      render(<Harness registry={createShortcutRegistry()} />)
      press({ key: '?', shiftKey: true })
      expect(showModal).toHaveBeenCalledOnce()
    } finally {
      proto.showModal = original
    }
  })

  it('returns focus to the control that had it when the overlay closes', async () => {
    const user = userEvent.setup()
    render(<Harness registry={createShortcutRegistry()} />)
    const before = screen.getByRole('button', { name: 'Before' })
    before.focus()
    await user.keyboard('?')
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(before).toHaveFocus()
  })

  it('does nothing while focus is in a text field', async () => {
    const user = userEvent.setup()
    render(<Harness registry={createShortcutRegistry()} />)
    await user.click(screen.getByLabelText('Notes'))
    await user.keyboard('?')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText('Notes')).toHaveValue('?')
  })

  it('does nothing in a textarea or a contenteditable region either', () => {
    render(
      <Harness registry={createShortcutRegistry()}>
        <textarea aria-label="Body" />
        <div contentEditable suppressContentEditableWarning aria-label="Rich" role="textbox" />
      </Harness>,
    )
    press({ key: '?', shiftKey: true }, screen.getByLabelText('Body'))
    press({ key: '?', shiftKey: true }, screen.getByLabelText('Rich'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the page behind it quiet while open', async () => {
    const registry = createShortcutRegistry()
    const onRun = vi.fn()
    render(
      <Harness registry={registry}>
        <PageShortcuts onRun={onRun} />
      </Harness>,
    )
    press({ key: '?', shiftKey: true })
    await screen.findByRole('dialog')
    press({ key: 'n' })
    expect(onRun).not.toHaveBeenCalled()
  })

  it('lists exactly what the registry holds, grouped by scope', async () => {
    const registry = createShortcutRegistry()
    registry.register({ key: 'g m', description: 'Go to matters', scope: 'global', run: vi.fn() })
    render(
      <Harness registry={registry}>
        <PageShortcuts onRun={vi.fn()} />
      </Harness>,
    )
    press({ key: '?', shiftKey: true })
    const dialog = await screen.findByRole('dialog')

    const everywhere = within(within(dialog).getByRole('region', { name: 'Everywhere' }))
    const onPage = within(within(dialog).getByRole('region', { name: 'On this page' }))
    const rowsOf = (scope: typeof everywhere) =>
      scope.getAllByRole('term').map((term) => term.textContent)

    expect(rowsOf(everywhere)).toEqual(['Go to matters', 'Show keyboard shortcuts'])
    expect(rowsOf(onPage)).toEqual(['Next thing'])

    const rendered = [...rowsOf(everywhere), ...rowsOf(onPage)].sort()
    const held = registry.list().map((entry) => entry.description).sort()
    expect(rendered).toEqual(held)
  })

  it('drops a page’s shortcuts from the list when the page unmounts', async () => {
    const registry = createShortcutRegistry()
    function Page() {
      const [shown, setShown] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setShown(false)}>
            Leave
          </button>
          {shown ? <PageShortcuts onRun={vi.fn()} /> : null}
        </>
      )
    }
    render(
      <Harness registry={registry}>
        <Page />
      </Harness>,
    )
    expect(registry.list().map((entry) => entry.description)).toContain('Next thing')
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(registry.list().map((entry) => entry.description)).not.toContain('Next thing')
  })

  it('says so when nothing is registered', async () => {
    const { ShortcutList } = await import('../components/Shortcuts')
    render(<ShortcutList shortcuts={[]} />)
    expect(screen.getByText('No shortcuts are registered.')).toBeInTheDocument()
  })
})

describe('useShortcut', () => {
  it('calls the latest handler without re-registering', () => {
    const registry = createShortcutRegistry()
    const register = vi.spyOn(registry, 'register')
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <ShortcutProvider registry={registry}>
        <PageShortcuts onRun={first} />
      </ShortcutProvider>,
    )
    rerender(
      <ShortcutProvider registry={registry}>
        <PageShortcuts onRun={second} />
      </ShortcutProvider>,
    )
    registry.handle(new KeyboardEvent('keydown', { key: 'n' }))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledOnce()
  })

  it('registers nothing for null', () => {
    const registry = createShortcutRegistry()
    function Nothing() {
      useShortcut(null)
      return null
    }
    render(
      <ShortcutProvider registry={registry}>
        <Nothing />
      </ShortcutProvider>,
    )
    expect(registry.list()).toEqual([])
  })
})

describe('NavigatorShell', () => {
  it('hosts the overlay with no wiring from the page', async () => {
    render(<NavigatorShell>Body</NavigatorShell>)
    press({ key: '?', shiftKey: true })
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })

  it('stays quiet when it is only a showcase sample', () => {
    render(<NavigatorShell showcase>Body</NavigatorShell>)
    press({ key: '?', shiftKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
