import { useState } from 'react'

import { NavigatorNavbar, NavigatorShell } from '../../src/components/Chrome'
import { useShortcut } from '../../src/components/Shortcuts'

/** A shell with one text field, one button, and one page shortcut — what the spec drives. */
export function ShortcutsDemo() {
  const [count, setCount] = useState(0)
  useShortcut({
    key: 'n',
    description: 'Count one',
    scope: 'page',
    run: () => setCount((value) => value + 1),
  })
  return (
    <NavigatorShell header={<NavigatorNavbar brand="Shortcuts" />}>
      <button type="button" data-testid="before">
        Before
      </button>
      <label>
        Notes
        <input data-testid="notes" />
      </label>
      <p data-testid="count">{count}</p>
    </NavigatorShell>
  )
}
