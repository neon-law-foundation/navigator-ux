import { useState } from 'react'

import { NavigatorNavbar, NavigatorShell } from '../../src/components/Chrome'
import { ChoiceGroup, Stepper } from '../../src/components/Focus'
import { useShortcut } from '../../src/components/Shortcuts'

/** A shell with one text field, one button, and one page shortcut — what the spec drives. */
export function ShortcutsDemo() {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState('')
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
      <form
        data-testid="walk"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setDone(`${data.get('name')}|${data.get('law')}|${data.getAll('extras').join(',')}`)
        }}
      >
        <Stepper
          label="Walk progress"
          finishType="submit"
          steps={[
            { id: 'name', title: 'Your name', children: <input aria-label="Name" name="name" /> },
            {
              id: 'law',
              title: 'Governing law',
              children: (
                <ChoiceGroup
                  legend="Which law governs?"
                  name="law"
                  choices={[
                    { value: 'nevada', label: 'Nevada' },
                    { value: 'california', label: 'California' },
                  ]}
                />
              ),
            },
            {
              id: 'extras',
              title: 'Extras',
              children: (
                <ChoiceGroup
                  legend="Which extras?"
                  name="extras"
                  multiple
                  choices={[
                    { value: 'nda', label: 'NDA' },
                    { value: 'ip', label: 'IP assignment' },
                  ]}
                />
              ),
            },
          ]}
        />
      </form>
      <p data-testid="done">{done}</p>
    </NavigatorShell>
  )
}
