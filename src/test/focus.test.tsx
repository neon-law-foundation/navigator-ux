import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fakeCompany } from '../../fixtures/fake.mjs'

import {
  ChoiceGroup,
  Hero,
  NavButton,
  NavLinkButton,
  Stage,
  StepList,
  Stepper,
  type Step,
} from '../index'

/*
 * The focus set: the page that shows one thing.
 *
 * Specimen data is drawn from `fixtures/fake.mjs` rather than written, for the
 * reason the gallery's is.
 */
const BRAND = fakeCompany('focus/brand')

/* ------------------------------------------------------------------ Stage -- */

describe('Stage', () => {
  it('centers one thing, at the medium measure and filling the viewport by default', () => {
    const { container } = render(
      <Stage>
        <p>Sign in</p>
      </Stage>,
    )
    const stage = container.firstElementChild as HTMLElement
    expect(stage.className).toBe('nav-stage nav-stage--md nav-stage--fill')
    expect(stage.querySelector('.nav-stage__header')).toBeNull()
    expect(stage.querySelector('.nav-stage__footer')).toBeNull()
    expect(within(stage.querySelector('.nav-stage__body') as HTMLElement).getByText('Sign in')).toBeInTheDocument()
  })

  it('takes a width, a header, a footer, and stops filling when told', () => {
    const { container } = render(
      <Stage width="sm" fill={false} className="intake" header={<b>{BRAND}</b>} footer={<p>Not advice.</p>}>
        <p>One question</p>
      </Stage>,
    )
    const stage = container.firstElementChild as HTMLElement
    expect(stage.className).toBe('nav-stage nav-stage--sm intake')
    expect(stage.querySelector('.nav-stage__header')).toHaveTextContent(BRAND)
    expect(stage.querySelector('.nav-stage__footer')).toHaveTextContent('Not advice.')
  })
})

/* ------------------------------------------------------------------- Hero -- */

describe('Hero', () => {
  it('renders an h1 with eyebrow, lede, and actions, centered', () => {
    const { container } = render(
      <Hero
        eyebrow="Business formation"
        title="Start your company."
        lede="One fee."
        actions={<NavLinkButton href="#go">Go</NavLinkButton>}
        id="hero-title"
      />,
    )
    expect(container.firstElementChild?.className).toBe('nav-hero')
    const heading = screen.getByRole('heading', { level: 1, name: 'Start your company.' })
    expect(heading).toHaveAttribute('id', 'hero-title')
    expect(screen.getByText('Business formation')).toHaveClass('nav-hero__eyebrow')
    expect(screen.getByText('One fee.')).toHaveClass('nav-hero__lede')
    expect(screen.getByRole('link', { name: 'Go' }).parentElement).toHaveClass('nav-hero__actions')
  })

  it('steps down to an h2 and aligns to the start when asked', () => {
    const { container } = render(<Hero title="Received" level={2} align="start" />)
    expect(container.firstElementChild?.className).toBe('nav-hero nav-hero--start')
    expect(screen.getByRole('heading', { level: 2, name: 'Received' })).toBeInTheDocument()
    expect(container.querySelector('.nav-hero__eyebrow')).toBeNull()
    expect(container.querySelector('.nav-hero__lede')).toBeNull()
    expect(container.querySelector('.nav-hero__actions')).toBeNull()
    expect(container.querySelector('picture')).toBeNull()
  })

  it('renders every responsive source and its accessible fallback image', () => {
    const { container } = render(
      <Hero
        title="A clear next step"
        image={{
          sources: [
            { type: 'image/avif', srcSet: '/hero.avif 1200w' },
            { type: 'image/jpeg', srcSet: '/hero.jpg 1200w' },
          ],
          src: '/hero.jpg',
          alt: 'A city skyline at dusk.',
          sizes: '100vw',
        }}
      />,
    )
    const picture = container.querySelector('picture')
    expect(picture).not.toBeNull()
    expect(picture?.querySelectorAll('source')).toHaveLength(2)
    expect(picture?.querySelector('source[type="image/avif"]')).toHaveAttribute('srcset', '/hero.avif 1200w')
    expect(picture?.querySelector('source[type="image/jpeg"]')).toHaveAttribute('srcset', '/hero.jpg 1200w')
    expect(picture?.querySelector('img')).toHaveAttribute('src', '/hero.jpg')
    expect(picture?.querySelector('img')).toHaveAttribute('alt', 'A city skyline at dusk.')
    expect(picture?.querySelector('img')).toHaveAttribute('sizes', '100vw')
  })
})

/* ------------------------------------------------------------ ChoiceGroup -- */

const NEEDS = [
  { value: 'company', label: 'Form a company', description: 'An LLC or a corporation.' },
  { value: 'estate', label: 'Plan an estate' },
  { value: 'eviction', label: 'Answer an eviction notice', disabled: true, icon: <span>!</span> },
]

describe('ChoiceGroup', () => {
  it('is a fieldset of native radios, one per card, and reports the single choice', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ChoiceGroup legend="What do you need?" name="need" choices={NEEDS} onValueChange={onValueChange} required />,
    )

    const group = screen.getByRole('group', { name: /What do you need\?/ })
    expect(group).toHaveAttribute('aria-required', 'true')
    expect(group.className).toBe('nav-choice-group')
    expect(group.querySelector('legend')).not.toHaveClass('nav-visually-hidden')

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    for (const radio of radios) expect(radio).toHaveAttribute('name', 'need')
    const [company, estate, eviction] = radios as [HTMLElement, HTMLElement, HTMLElement]
    expect(company).toBeRequired()
    expect(eviction).toBeDisabled()
    expect(eviction.closest('.nav-choice')).toHaveClass('is-disabled')
    expect(screen.getByText('An LLC or a corporation.')).toHaveClass('nav-choice__description')
    expect(screen.getByText('!').parentElement).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByLabelText(/Form a company/))
    expect(onValueChange).toHaveBeenLastCalledWith(['company'])
    expect(company).toBeChecked()
    expect(company.closest('.nav-choice')).toHaveClass('is-checked')

    await user.click(screen.getByLabelText(/Plan an estate/))
    expect(onValueChange).toHaveBeenLastCalledWith(['estate'])
    expect(company).not.toBeChecked()
    expect(company.closest('.nav-choice')).not.toHaveClass('is-checked')
    expect(estate.closest('.nav-choice')).toHaveClass('is-checked')
  })

  it('becomes checkboxes when several may be chosen, seeded from an array default', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ChoiceGroup
        legend="What do you have?"
        name="have"
        multiple
        columns={2}
        defaultValue={['name']}
        choices={[
          { value: 'name', label: 'A name' },
          { value: 'owners', label: 'Other owners' },
        ]}
        onValueChange={onValueChange}
        required
      />,
    )
    expect(screen.getByRole('group').className).toBe('nav-choice-group nav-choice-group--cols-2')
    const [name, owners] = screen.getAllByRole('checkbox') as [HTMLElement, HTMLElement]
    expect(name).toBeChecked()
    // `required` would mean "all of these" on checkboxes, so it is not passed down.
    expect(name).not.toBeRequired()

    await user.click(owners)
    expect(onValueChange).toHaveBeenLastCalledWith(['name', 'owners'])
    await user.click(name)
    expect(onValueChange).toHaveBeenLastCalledWith(['owners'])
    expect(name).not.toBeChecked()
  })

  it('seeds a single default, hides the legend from sight only, and wires help and error', () => {
    render(
      <ChoiceGroup
        legend="Delivery"
        legendHidden
        name="delivery"
        defaultValue="portal"
        columns={3}
        choices={[{ value: 'portal', label: 'Portal' }, { value: 'email', label: 'Email' }]}
        help="Pick one."
        error="Choose one."
      />,
    )
    const group = screen.getByRole('group', { name: 'Delivery' })
    expect(group.querySelector('legend')).toHaveClass('nav-visually-hidden')
    expect(group.className).toBe('nav-choice-group nav-choice-group--cols-3 nav-field--invalid')
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('radio', { name: 'Portal' })).toBeChecked()

    const help = screen.getByText('Pick one.')
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Choose one.')
    expect(group.getAttribute('aria-describedby')).toBe(`${error.id} ${help.id}`)
  })

  it('describes itself with nothing when there is no help and no error', () => {
    render(<ChoiceGroup legend="Plain" name="plain" choices={[{ value: 'a', label: 'A' }]} />)
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-invalid')
  })
})

/* --------------------------------------------------------------- StepList -- */

const STEPS: Step[] = [
  { id: 'need', title: 'What do you need?', children: <p>Step one body</p> },
  { id: 'have', title: 'What do you have?', description: 'Check all that apply.', children: <p>Step two body</p> },
  { id: 'you', title: 'How do we reach you?', children: <input aria-label="Email" /> },
]

describe('StepList', () => {
  it('marks the current step and makes only completed steps clickable', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<StepList steps={STEPS} current={1} label="Intake progress" onSelect={onSelect} />)

    const list = screen.getByRole('list', { name: 'Intake progress' })
    const items = within(list).getAllByRole('listitem') as [HTMLElement, HTMLElement, HTMLElement]
    expect(items.map((item) => item.className)).toEqual([
      'nav-steps__item is-done',
      'nav-steps__item is-current',
      'nav-steps__item is-upcoming',
    ])
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')

    const buttons = within(list).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    const revisit = buttons[0] as HTMLElement
    expect(revisit).toHaveTextContent('What do you need?, completed')
    // A completed step drops its number for the drawn check; the others count.
    expect(items[0].querySelector('.nav-steps__marker')).toHaveTextContent('')
    expect(items[1].querySelector('.nav-steps__marker')).toHaveTextContent('2')

    await user.click(revisit)
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('renders no buttons at all when nothing listens', () => {
    render(<StepList steps={STEPS} current={2} label="Progress" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

/* ---------------------------------------------------------------- Stepper -- */

describe('Stepper', () => {
  it('shows one step at a time, keeps the rest in the tree, and moves focus to the new title', async () => {
    const user = userEvent.setup()
    const onCurrentChange = vi.fn()
    render(<Stepper steps={STEPS} label="Intake progress" onCurrentChange={onCurrentChange} />)

    const panels = document.querySelectorAll('.nav-stepper__panel')
    expect(panels).toHaveLength(3)
    expect(panels[0]).not.toHaveAttribute('hidden')
    expect(panels[1]).toHaveAttribute('hidden')
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    // No Back on the first step: there is nowhere to go.
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onCurrentChange).toHaveBeenLastCalledWith(1)
    expect(panels[0]).toHaveAttribute('hidden')
    expect(panels[1]).not.toHaveAttribute('hidden')
    const title = screen.getByRole('heading', { level: 2, name: 'What do you have?' })
    expect(document.activeElement).toBe(title)
    expect(panels[1]).toHaveAttribute('aria-labelledby', title.id)
    expect(screen.getByText('Check all that apply.')).toHaveClass('nav-stepper__description')

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Finish' })).toHaveAttribute('type', 'button')

    // Typed on the last step, kept after going back and forward again.
    await user.type(screen.getByLabelText('Email'), 'a@example.com')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onCurrentChange).toHaveBeenLastCalledWith(1)
    expect(panels[2]).toHaveAttribute('hidden')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByLabelText('Email')).toHaveValue('a@example.com')

    // The rail sends a completed step's click back through the same path.
    await user.click(within(screen.getByRole('list')).getByRole('button', { name: /What do you need\?/ }))
    expect(onCurrentChange).toHaveBeenLastCalledWith(0)
    expect(panels[0]).not.toHaveAttribute('hidden')
  })

  it('holds Continue until the step may advance, and fires onComplete from the last step', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <Stepper
        steps={STEPS}
        label="Progress"
        defaultCurrent={2}
        canAdvance={false}
        onComplete={onComplete}
        labels={{ back: 'Previous', finish: 'Send' }}
        hideSteps
      />,
    )
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    const finish = screen.getByRole('button', { name: 'Send' })
    expect(finish).toBeDisabled()
    expect(finish).toHaveClass('nav-btn--lg')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    await user.click(finish)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('calls onComplete when the last step is live', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Stepper steps={STEPS} label="Progress" defaultCurrent={2} onComplete={onComplete} labels={{ next: 'Go on' }} />)
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('submits the surrounding form when the finish is a submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Stepper steps={STEPS} label="Progress" defaultCurrent={2} finishType="submit" />
      </form>,
    )
    const finish = screen.getByRole('button', { name: 'Finish' })
    expect(finish).toHaveAttribute('type', 'submit')
    await user.click(finish)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('follows a controlled index and clamps one that is out of range', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [current, setCurrent] = useState(5)
      return <Stepper steps={STEPS} label="Progress" current={current} onCurrentChange={setCurrent} />
    }
    render(<Harness />)
    // 5 is past the end; the last step shows.
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { level: 2, name: 'What do you have?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Step 3 of 3').closest('section')).not.toHaveAttribute('hidden')
  })

  it('renders nothing for no steps', () => {
    const { container } = render(<Stepper steps={[]} label="Progress" />)
    expect(container).toBeEmptyDOMElement()
  })
})

/* ------------------------------------------------------------- Button size -- */

describe('NavButton sizes', () => {
  it('adds the large and block classes only when asked', () => {
    render(
      <>
        <NavButton variant="primary" size="lg" block>
          Big
        </NavButton>
        <NavButton size="md">Plain</NavButton>
        <NavButton variant="outline" size="sm">
          Small
        </NavButton>
        <NavLinkButton href="#x" size="lg">
          Link
        </NavLinkButton>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Big' }).className).toBe('nav-btn nav-btn--primary nav-btn--lg nav-btn--block')
    expect(screen.getByRole('button', { name: 'Plain' }).className).toBe('nav-btn')
    expect(screen.getByRole('button', { name: 'Small' }).className).toBe('nav-btn nav-btn--outline nav-btn--sm')
    expect(screen.getByRole('link', { name: 'Link' }).className).toBe('nav-btn nav-btn--lg')
  })
})
