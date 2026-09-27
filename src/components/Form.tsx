import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

/*
 * The form card and its fields.
 *
 * Every control is wired to its label, its help text, and its error through
 * generated ids. That wiring is the component's whole reason to exist — a
 * `<label>` beside an `<input>` looks correct and announces nothing, and help
 * text that is not in `aria-describedby` is help text a screen-reader user
 * never hears.
 *
 * These are uncontrolled by default and post to a URL. A form that works
 * without JavaScript is a form that still works when the bundle fails.
 */

/* --------------------------------------------------------------- FormCard -- */

export interface FormCardProps {
  title?: ReactNode
  /** Framing prose between the title and the first field. */
  intro?: ReactNode
  /** Where it posts. */
  action?: string
  method?: 'get' | 'post'
  /** Field-level and form-level errors render above the fields. */
  error?: ReactNode
  /** A standing note — "this record cannot be edited after approval". */
  notice?: ReactNode
  /**
   * Drop the narrow measure so the form can share a table's width. The default
   * stays a column because a short create form is easier to scan that way.
   */
  span?: 'full'
  children: ReactNode
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
}

export function FormCard({
  title,
  intro,
  action,
  method = 'post',
  error,
  notice,
  span,
  children,
  onSubmit,
}: FormCardProps) {
  const formClass = ['nav-card', 'nav-form-card', span === 'full' ? 'nav-form-card--full' : null]
    .filter(Boolean)
    .join(' ')
  return (
    <form className={formClass} action={action} method={method} onSubmit={onSubmit}>
      <div className="nav-card__body">
        {title ? <h2 className="nav-form-card__title">{title}</h2> : null}
        {intro ? <p className="nav-form-card__intro">{intro}</p> : null}
        {/* An alert, because it is the reason the submission did not go
            through and the reader may be nowhere near it on the page. */}
        {error ? (
          <p className="nav-form-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="nav-form-notice">{notice}</p> : null}
        {children}
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ Field -- */

interface FieldShellProps {
  label: ReactNode
  required?: boolean
  help?: ReactNode
  /** Present means invalid: the control is marked and the message announced. */
  error?: ReactNode
  /** Extra modifier — `nav-field--check`, say. */
  modifier?: string
  children: (wiring: {
    id: string
    describedBy: string | undefined
    invalid: boolean
  }) => ReactNode
}

/**
 * The label / control / help / error group.
 *
 * Takes a render prop rather than cloning its child: cloning to inject `id` and
 * `aria-describedby` breaks the moment a caller wraps the control in anything,
 * and fails silently when it does.
 */
function FieldShell({ label, required, help, error, modifier, children }: FieldShellProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  // Order matters: a screen reader reads the description in the order listed,
  // and the reason it was rejected should come before the general guidance.
  const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ')

  const classes = ['nav-field', modifier, error ? 'nav-field--invalid' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <label className="nav-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="nav-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      {help ? (
        <p className="nav-field__help" id={helpId}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="nav-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type FieldChrome = Omit<FieldShellProps, 'children' | 'modifier'>

export type TextFieldProps = FieldChrome &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> & {
    /** A leading add-on inside the control's border — a "$", say. */
    addon?: ReactNode
  }

export function TextField({ label, required, help, error, addon, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} help={help} error={error}>
      {({ id, describedBy, invalid }) => {
        const input = (
          <input
            className="nav-input"
            id={id}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...rest}
          />
        )
        return addon ? (
          <div className="nav-input-group">
            <span className="nav-input-group__addon" aria-hidden="true">
              {addon}
            </span>
            {input}
          </div>
        ) : (
          input
        )
      }}
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export type SelectFieldProps = FieldChrome &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> & {
    options: SelectOption[]
    /** A leading empty option — "Choose one". */
    placeholder?: string
  }

export function SelectField({
  label,
  required,
  help,
  error,
  options,
  placeholder,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} help={help} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          className="nav-select"
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}

export type TextareaFieldProps = FieldChrome &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'required'>

export function TextareaField({ label, required, help, error, ...rest }: TextareaFieldProps) {
  return (
    <FieldShell label={label} required={required} help={help} error={error}>
      {({ id, describedBy, invalid }) => (
        // `.nav-input` covers the textarea too — it renders with that class.
        <textarea
          className="nav-input"
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

export type CheckboxFieldProps = FieldChrome &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'type'>

/** A checkbox row: the box precedes an inline label. */
export function CheckboxField({ label, required, help, error, ...rest }: CheckboxFieldProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ')

  const classes = ['nav-field', 'nav-field--check', error ? 'nav-field--invalid' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <input
        className="nav-check"
        type="checkbox"
        id={id}
        required={required}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error) || undefined}
        {...rest}
      />
      <label className="nav-label" htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className="nav-field__help" id={helpId}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="nav-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/* --------------------------------------------------------------- Fieldset -- */

export interface RadioChoice {
  value: string
  label: ReactNode
  /**
   * Already spoken for. Greyed out, and genuinely disabled — a choice that
   * only looks unavailable is a choice someone will submit.
   */
  locked?: boolean
  /** Why it is locked. */
  note?: ReactNode
}

export interface RadioGroupProps {
  legend: ReactNode
  name: string
  choices: RadioChoice[]
  defaultValue?: string
  error?: ReactNode
}

/**
 * One fieldset over mutually exclusive choices.
 *
 * A `<fieldset>` with a `<legend>` and not a div with a heading: it is what
 * makes a screen reader announce the group's question before each option,
 * rather than reading five unlabelled radio buttons.
 */
export function RadioGroup({ legend, name, choices, defaultValue, error }: RadioGroupProps) {
  const groupId = useId()
  const errorId = `${groupId}-error`

  return (
    <fieldset
      className={error ? 'nav-fieldset nav-field--radio nav-field--invalid' : 'nav-fieldset nav-field--radio'}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={Boolean(error) || undefined}
    >
      <legend className="nav-fieldset__legend">{legend}</legend>
      {choices.map((choice) => {
        const id = `${groupId}-${choice.value}`
        return (
          <div
            key={choice.value}
            className={choice.locked ? 'nav-radio nav-radio--locked' : 'nav-radio'}
          >
            <input
              type="radio"
              id={id}
              name={name}
              value={choice.value}
              defaultChecked={defaultValue === choice.value}
              disabled={choice.locked}
            />
            <label className="nav-label" htmlFor={id}>
              {choice.label}
              {choice.note ? <span className="nav-field__help"> {choice.note}</span> : null}
            </label>
          </div>
        )
      })}
      {error ? (
        <p className="nav-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

/* ------------------------------------------------------------- PeopleList -- */

export interface Person {
  /** Stable id. Also the value posted for this row. */
  id: string
  name: string
  email?: string
}

/** Referentially stable empty default; see the note in Chrome.tsx. */
const NO_IDS: readonly string[] = Object.freeze([])

export interface PeopleListProps {
  legend: ReactNode
  name: string
  people: Person[]
  /** Ids checked on first render — the answer to a prior question. */
  defaultSelected?: readonly string[]
  /** Shown when the prior answer named nobody. */
  empty?: ReactNode
}

/**
 * A bounded list of people, pre-filled from a prior answer.
 *
 * Bounded is the point: the set comes from something the reader already told
 * us, so this is a set of checkboxes and not a search box. There is nothing to
 * look up and nothing to get wrong.
 */
export function PeopleList({
  legend,
  name,
  people,
  defaultSelected = NO_IDS,
  empty = 'Nobody was named earlier.',
}: PeopleListProps) {
  const groupId = useId()

  return (
    <fieldset className="nav-fieldset nav-people-list">
      <legend className="nav-fieldset__legend">{legend}</legend>
      {people.length === 0 ? (
        <p className="nav-empty">{empty}</p>
      ) : (
        people.map((person) => {
          const id = `${groupId}-${person.id}`
          return (
            <div key={person.id} className="nav-field nav-field--check">
              <input
                type="checkbox"
                id={id}
                name={name}
                value={person.id}
                defaultChecked={defaultSelected.includes(person.id)}
              />
              <label className="nav-label" htmlFor={id}>
                {person.name}
                {person.email ? (
                  <span className="nav-text-muted"> {person.email}</span>
                ) : null}
              </label>
            </div>
          )
        })
      )}
    </fieldset>
  )
}
