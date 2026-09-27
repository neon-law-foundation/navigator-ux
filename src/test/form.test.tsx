import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakePerson } from '../../fixtures/fake.mjs'
import {
  CheckboxField,
  FormCard,
  PeopleList,
  RadioGroup,
  SelectField,
  TextField,
  TextareaField,
} from '../components/Form'

describe('FormCard', () => {
  it('posts to its action by default', () => {
    const { container } = render(
      <FormCard action="/people" title="New person" intro="Everyone on the matter.">
        <TextField label="Name" name="name" />
      </FormCard>,
    )
    const form = container.querySelector('form')
    expect(form).toHaveAttribute('action', '/people')
    expect(form).toHaveAttribute('method', 'post')
    expect(screen.getByRole('heading', { name: 'New person' })).toBeInTheDocument()
    expect(screen.getByText('Everyone on the matter.')).toBeInTheDocument()
  })

  it('announces a form-level rejection', () => {
    render(
      <FormCard error="That email is already registered.">
        <TextField label="Email" name="email" />
      </FormCard>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('That email is already registered.')
  })

  it('renders a standing notice without announcing it', () => {
    const { container } = render(
      <FormCard notice="Approved records cannot be edited.">
        <TextField label="Name" name="name" />
      </FormCard>,
    )
    expect(container.querySelector('.nav-form-notice')).toHaveTextContent(
      'Approved records cannot be edited.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('omits every optional part', () => {
    const { container } = render(
      <FormCard method="get">
        <TextField label="Query" name="q" />
      </FormCard>,
    )
    expect(container.querySelector('.nav-form-card__title')).toBeNull()
    expect(container.querySelector('.nav-form-card__intro')).toBeNull()
    expect(container.querySelector('form')).toHaveAttribute('method', 'get')
  })

  it('drops the measure when it spans the full width', () => {
    const { container } = render(
      <FormCard span="full" title="New person">
        <TextField label="Name" name="name" />
      </FormCard>,
    )
    expect(container.querySelector('form')).toHaveClass('nav-form-card--full')
  })

  it('calls onSubmit when it has one', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const user = userEvent.setup()
    render(
      <FormCard onSubmit={onSubmit}>
        <button type="submit">Save</button>
      </FormCard>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalled()
  })
})

describe('TextField', () => {
  it('ties the label to the control', () => {
    render(<TextField label="Full name" name="name" />)
    expect(screen.getByLabelText('Full name')).toHaveClass('nav-input')
  })

  it('describes the control with its help text', () => {
    render(<TextField label="Email" name="email" help="We only use this for filings." />)
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'We only use this for filings.',
    )
  })

  it('marks the control invalid and announces the reason', () => {
    const { container } = render(
      <TextField label="Email" name="email" error="Enter a valid email address." />,
    )
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(container.querySelector('.nav-field')).toHaveClass('nav-field--invalid')
  })

  it('reads the rejection before the general guidance', () => {
    render(<TextField label="Email" name="email" help="Work address." error="Required." />)
    // Both are in aria-describedby; order is what the reader hears.
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Required. Work address.')
  })

  it('marks a required control and shows the asterisk decoratively', () => {
    const { container } = render(<TextField label="Name" name="name" required />)
    expect(screen.getByLabelText(/Name/)).toBeRequired()
    expect(container.querySelector('.nav-required')).toHaveAttribute('aria-hidden', 'true')
  })

  it('wraps the control in a group when it has a leading add-on', () => {
    const { container } = render(<TextField label="Fee" name="fee" addon="$" />)
    expect(container.querySelector('.nav-input-group')).not.toBeNull()
    expect(container.querySelector('.nav-input-group__addon')).toHaveTextContent('$')
  })

  it('leaves the control bare without one', () => {
    const { container } = render(<TextField label="Fee" name="fee" />)
    expect(container.querySelector('.nav-input-group')).toBeNull()
  })
})

describe('SelectField', () => {
  const options = [
    { value: 'nv', label: 'Nevada' },
    { value: 'ca', label: 'California' },
  ]

  it('renders its options and a placeholder', () => {
    render(
      <SelectField label="State" name="state" options={options} placeholder="Choose a state" />,
    )
    expect(screen.getByLabelText('State')).toHaveClass('nav-select')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Choose a state' })).toHaveValue('')
  })

  it('omits the placeholder when there is none', () => {
    render(<SelectField label="State" name="state" options={options} />)
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('carries the invalid state', () => {
    render(<SelectField label="State" name="state" options={options} error="Pick one." />)
    expect(screen.getByLabelText('State')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('TextareaField', () => {
  it('renders with the shared input class', () => {
    render(<TextareaField label="Summary" name="summary" help="A paragraph is plenty." />)
    const box = screen.getByLabelText('Summary')
    expect(box.tagName).toBe('TEXTAREA')
    expect(box).toHaveClass('nav-input')
    expect(box).toHaveAccessibleDescription('A paragraph is plenty.')
  })

  it('carries the invalid state', () => {
    render(<TextareaField label="Summary" name="summary" error="Too long." />)
    expect(screen.getByLabelText('Summary')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('CheckboxField', () => {
  it('ties the label to the box', async () => {
    const user = userEvent.setup()
    render(<CheckboxField label="Send the welcome email" name="welcome" />)
    const box = screen.getByLabelText('Send the welcome email')
    await user.click(box)
    expect(box).toBeChecked()
  })

  it('describes and marks an invalid box', () => {
    const { container } = render(
      <CheckboxField
        label="Accept the terms"
        name="terms"
        help="Required to continue."
        error="You must accept the terms."
      />,
    )
    const box = screen.getByLabelText('Accept the terms')
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('You must accept the terms. Required to continue.')
    expect(container.querySelector('.nav-field')).toHaveClass('nav-field--invalid')
  })

  it('renders bare with no help or error', () => {
    const { container } = render(<CheckboxField label="Subscribe" name="sub" required />)
    expect(container.querySelector('.nav-field__help')).toBeNull()
    expect(container.querySelector('.nav-field__error')).toBeNull()
    expect(screen.getByLabelText('Subscribe')).toBeRequired()
  })
})

describe('RadioGroup', () => {
  const choices = [
    { value: 'lead', label: 'Lead counsel' },
    { value: 'support', label: 'Supporting' },
    { value: 'conflicted', label: 'Conflicted', locked: true, note: 'Waiver outstanding.' },
  ]

  it('groups the choices under a legend', () => {
    render(<RadioGroup legend="Role on the matter" name="role" choices={choices} />)
    // The legend is what a screen reader announces before each option.
    expect(screen.getByRole('group', { name: /Role on the matter/ })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('checks the supplied default', () => {
    render(
      <RadioGroup legend="Role" name="role" choices={choices} defaultValue="support" />,
    )
    expect(screen.getByLabelText('Supporting')).toBeChecked()
    expect(screen.getByLabelText('Lead counsel')).not.toBeChecked()
  })

  it('genuinely disables a locked choice, not just grays it', () => {
    const { container } = render(<RadioGroup legend="Role" name="role" choices={choices} />)
    expect(screen.getByLabelText(/Conflicted/)).toBeDisabled()
    expect(container.querySelector('.nav-radio--locked')).not.toBeNull()
    expect(screen.getByText('Waiver outstanding.')).toBeInTheDocument()
  })

  it('announces a group-level rejection', () => {
    const { container } = render(
      <RadioGroup legend="Role" name="role" choices={choices} error="Choose a role." />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a role.')
    expect(container.querySelector('fieldset')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('PeopleList', () => {
  // The second person has no address on purpose: one test is that the email
  // line appears only where there is one.
  const withEmail = fakePerson('form/recipient-with-email')
  const withoutEmail = fakePerson('form/recipient-no-email')
  const people = [
    { id: 'p1', name: withEmail.name, email: withEmail.email },
    { id: 'p2', name: withoutEmail.name },
  ]

  it('pre-fills from the prior answer', () => {
    render(
      <PeopleList
        legend="Who should receive it?"
        name="recipients"
        people={people}
        defaultSelected={['p2']}
      />,
    )
    expect(screen.getByLabelText(new RegExp(withoutEmail.name))).toBeChecked()
    expect(screen.getByLabelText(new RegExp(withEmail.name))).not.toBeChecked()
  })

  it('posts the person id, not the name', () => {
    render(<PeopleList legend="Recipients" name="recipients" people={people} />)
    expect(screen.getByLabelText(new RegExp(withEmail.name))).toHaveAttribute('value', 'p1')
    expect(screen.getByLabelText(new RegExp(withEmail.name))).toHaveAttribute(
      'name',
      'recipients',
    )
  })

  it('shows the email only when there is one', () => {
    render(<PeopleList legend="Recipients" name="recipients" people={people} />)
    expect(screen.getByText(withEmail.email)).toBeInTheDocument()
  })

  it('explains an empty list rather than rendering nothing', () => {
    render(<PeopleList legend="Recipients" name="recipients" people={[]} />)
    expect(screen.getByText('Nobody was named earlier.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('takes a custom empty message', () => {
    render(
      <PeopleList legend="Recipients" name="recipients" people={[]} empty="No participants." />,
    )
    expect(screen.getByText('No participants.')).toBeInTheDocument()
  })
})
