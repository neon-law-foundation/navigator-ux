import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ChoiceGroup,
  ShortcutHost,
  Stepper,
  createShortcutRegistry,
  ShortcutProvider,
  type Step,
} from '../index'

/*
 * The questionnaire's keyboard contract, walked with the keyboard alone: no
 * `click` appears below. A seed-shaped notation — a text question, a radio, a
 * checkbox group and a closing text field — is completed and submitted.
 */
const STEPS: Step[] = [
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
          { value: 'washington', label: 'Washington' },
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
          { value: 'tax', label: 'Tax gross-up' },
        ]}
      />
    ),
  },
  { id: 'notes', title: 'Notes', children: <textarea aria-label="Remarks" name="notes" /> },
]

function Walk({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  return (
    <ShortcutProvider registry={createShortcutRegistry()}>
      <ShortcutHost />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(new FormData(event.currentTarget))
        }}
      >
        <Stepper steps={STEPS} label="Progress" finishType="submit" />
      </form>
    </ShortcutProvider>
  )
}

describe('Stepper keyboard shortcuts', () => {
  it('walks a whole questionnaire to submission with the keyboard alone', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Walk onSubmit={onSubmit} />)

    // Step 1: focus starts nowhere; typing is typing, and Mod+Enter advances from the field.
    screen.getByLabelText('Name').focus()
    await user.keyboard('Ada{Control>}{Enter}{/Control}')
    // Advancing moved focus to the new step's first input.
    expect(screen.getByLabelText('Nevada')).toHaveFocus()

    // Step 2 (radio): a digit picks the option, Mod+Enter moves on.
    await user.keyboard('2')
    expect(screen.getByLabelText('California')).toBeChecked()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getByLabelText('NDA')).toHaveFocus()

    // Step 3 (checkbox): digits toggle, and a second press unchecks.
    await user.keyboard('1')
    await user.keyboard('3')
    await user.keyboard('3')
    expect(screen.getByLabelText('NDA')).toBeChecked()
    expect(screen.getByLabelText('IP assignment')).not.toBeChecked()
    expect(screen.getByLabelText('Tax gross-up')).not.toBeChecked()
    await user.keyboard('{Control>}{Enter}{/Control}')

    // Step 4 (the last): digits are text in a textarea, and Mod+Enter submits.
    expect(screen.getByLabelText('Remarks')).toHaveFocus()
    await user.keyboard('7 days')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const data = onSubmit.mock.calls[0]![0] as FormData
    expect(data.get('name')).toBe('Ada')
    expect(data.get('law')).toBe('california')
    expect(data.getAll('extras')).toEqual(['nda'])
    expect(data.get('notes')).toBe('7 days')
  })

  it('goes back with Mod+Backspace and Alt+ArrowLeft, but not from inside a text field', async () => {
    const user = userEvent.setup()
    render(<Walk onSubmit={vi.fn()} />)
    screen.getByLabelText('Name').focus()
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getByText('Step 4 of 4')).toBeVisible()

    // Focus is in the textarea: Alt+← is left to the field.
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(screen.getByText('Step 4 of 4').closest('section')).not.toHaveAttribute('hidden')

    // Out of the field, both go back one step.
    ;(document.activeElement as HTMLElement).blur()
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(screen.getByText('Step 3 of 4').closest('section')).not.toHaveAttribute('hidden')
    await user.keyboard('{Control>}{Backspace}{/Control}')
    expect(screen.getByText('Step 2 of 4').closest('section')).not.toHaveAttribute('hidden')
    expect(screen.getByLabelText('Nevada')).toHaveFocus()
  })

  it('does not advance past a step that may not advance', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <ShortcutProvider registry={createShortcutRegistry()}>
        <ShortcutHost />
        <Stepper steps={STEPS} label="Progress" canAdvance={false} onComplete={onComplete} />
      </ShortcutProvider>,
    )
    screen.getByLabelText('Name').focus()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getByText('Step 1 of 4').closest('section')).not.toHaveAttribute('hidden')
  })

  it('calls onComplete from the last step when it is not a submit', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <ShortcutProvider registry={createShortcutRegistry()}>
        <ShortcutHost />
        <Stepper steps={STEPS} label="Progress" defaultCurrent={3} onComplete={onComplete} />
      </ShortcutProvider>,
    )
    screen.getByLabelText('Remarks').focus()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('lists exactly the keys that apply to the step in the ? overlay', async () => {
    const user = userEvent.setup()
    render(<Walk onSubmit={vi.fn()} />)
    const listed = async () => {
      screen.getByRole('heading', { level: 2, name: /./ }).focus()
      await user.keyboard('?')
      const dialog = await screen.findByRole('dialog')
      const rows = Array.from(dialog.querySelectorAll('dt')).map((dt) => dt.textContent)
      await user.keyboard('{Escape}')
      return rows
    }
    // First step: text only, nothing before it — no Back, no numbered options.
    expect(await listed()).toEqual([
      'Show keyboard shortcuts',
      'Next question, or submit on the last',
    ])
    screen.getByLabelText('Name').focus()
    await user.keyboard('{Control>}{Enter}{/Control}')
    // Second step: it has options and a step behind it.
    expect(await listed()).toEqual([
      'Show keyboard shortcuts',
      'Next question, or submit on the last',
      'Previous question',
      'Previous question',
      'Choose the numbered option',
    ])
  })
})
