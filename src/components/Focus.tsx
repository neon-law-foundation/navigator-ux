import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { NavButton } from './Navigation'
import { useShortcut } from './Shortcuts'

/*
 * The focus set — Stage, Hero, ChoiceGroup, StepList, and Stepper.
 *
 * Everything else in this library sits in a 72rem column beside other things.
 * These are for the page that shows one thing: a sign-in, one question of an
 * intake, a decision between two options. shadcn's login and onboarding blocks
 * are the reference — a card no wider than it needs to be, centered in the
 * whole viewport, with more space around it than inside it — rendered here in
 * the serif and the teal rather than in Inter and grey.
 *
 * Spacing reads the `--nav-space-*` scale, and the numbers are deliberately a
 * step or two up from the rest of the stylesheet's. Density is right for a
 * portal page a practitioner reads forty times a day. It is wrong for a
 * question put to someone who has never seen the page before, and this set
 * exists for the second reader.
 */

/* ------------------------------------------------------------------ Stage -- */

/** A card (`sm`, 24rem), a form (`md`, 36rem), or a reading column (`lg`, 48rem). */
export type StageWidth = 'sm' | 'md' | 'lg'

export interface StageProps {
  children: ReactNode
  /** How wide the one thing may be. `md` unless told otherwise. */
  width?: StageWidth
  /** Above the thing — a brand mark, a "Step 2 of 5". Stays at the top. */
  header?: ReactNode
  /** Below it — fine print, a way out. Stays at the bottom. */
  footer?: ReactNode
  /**
   * Take the whole viewport, which is the default. Turn it off when the stage
   * sits inside chrome that already gives it a height; set
   * `--nav-stage-min-height` instead when it sits under a fixed header.
   */
  fill?: boolean
  className?: string
}

/**
 * The viewport, given to one thing.
 *
 * Three rows: header, the thing, footer. The thing is centered in whatever is
 * left, so a short card floats and a long form starts near the top and
 * scrolls — `min-height` rather than `height`, because a stage that clips its
 * own content is a stage a phone user cannot finish.
 */
export function Stage({ children, width = 'md', header, footer, fill = true, className }: StageProps) {
  const classes = ['nav-stage', `nav-stage--${width}`, fill ? 'nav-stage--fill' : null, className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes}>
      {header ? <div className="nav-stage__header">{header}</div> : null}
      <div className="nav-stage__body">{children}</div>
      {footer ? <div className="nav-stage__footer">{footer}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------- Hero -- */

export interface HeroProps {
  /** A short line above the title — the practice area, the matter, the privilege notice. */
  eyebrow?: ReactNode
  title: ReactNode
  /** One or two sentences under the title. Only what the reader needs in order to act. */
  lede?: ReactNode
  /** The buttons. One primary, and at most one other. */
  actions?: ReactNode
  /** Centered, because the stage is. `start` for a hero at the top of a column. */
  align?: 'center' | 'start'
  /** `1` on a page with no other h1; `2` inside a stepper or a section. */
  level?: 1 | 2
  /** For `aria-labelledby` on the region the hero introduces. */
  id?: string
  /** A responsive image above the text. Omit it to keep the text-only hero. */
  image?: HeroImage
}

export interface HeroImageSource {
  /** The MIME type the browser should negotiate. */
  type: string
  /** Width-keyed candidates, such as `/hero.avif 1200w`. */
  srcSet: string
}

export interface HeroImage {
  /** Sources are rendered in negotiation order, usually AVIF then JPEG. */
  sources: readonly HeroImageSource[]
  /** The fallback URL for browsers that do not support the source formats. */
  src: string
  /** A useful description of the image; the image is not decorative. */
  alt: string
  /** The rendered image's width hint. */
  sizes: string
}

/**
 * The big type block: eyebrow, title, lede, actions.
 *
 * `PageHeader` and `CaseHead` are for a page with a lot on it and put the
 * title at the top left at 2rem. This is for a page with one thing on it and
 * puts the title in the middle at up to 3.5rem, which is the size the serif
 * was drawn to be read at. There is no third heading style; a hero that wants
 * to be smaller wants to be a `PageHeader`.
 */
export function Hero({ eyebrow, title, lede, actions, align = 'center', level = 1, id, image }: HeroProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={align === 'start' ? 'nav-hero nav-hero--start' : 'nav-hero'}>
      {image ? (
        <picture className="nav-hero__picture">
          {image.sources.map((source) => (
            <source key={`${source.type}:${source.srcSet}`} type={source.type} srcSet={source.srcSet} sizes={image.sizes} />
          ))}
          <img className="nav-hero__image" src={image.src} alt={image.alt} sizes={image.sizes} />
        </picture>
      ) : null}
      {eyebrow ? <p className="nav-hero__eyebrow">{eyebrow}</p> : null}
      <Heading className="nav-hero__title" id={id}>
        {title}
      </Heading>
      {lede ? <p className="nav-hero__lede">{lede}</p> : null}
      {actions ? <div className="nav-hero__actions">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------ ChoiceGroup -- */

export interface Choice {
  value: string
  label: ReactNode
  /** The second line — who this is for, what it costs, what happens next. */
  description?: ReactNode
  /** A leading glyph. Decorative; the label carries the meaning. */
  icon?: ReactNode
  disabled?: boolean
}

export interface ChoiceGroupProps {
  /**
   * The question. Always in the accessibility tree; `legendHidden` takes it off
   * the screen when a `Hero` above has already asked it in larger type.
   */
  legend: ReactNode
  legendHidden?: boolean
  /** The field name every option posts under. */
  name: string
  choices: readonly Choice[]
  /** Several may be chosen: checkboxes rather than radios. */
  multiple?: boolean
  defaultValue?: string | readonly string[]
  /** The checked values after each change. One entry unless `multiple`. */
  onValueChange?: (values: string[]) => void
  /**
   * Cards per row. One by default — a stack is read top to bottom, which is
   * the order the reader weighs the options in. Two or three for short labels.
   * Collapses to one on a narrow viewport regardless.
   */
  columns?: 1 | 2 | 3
  help?: ReactNode
  error?: ReactNode
  required?: boolean
}

function initialSelection(defaultValue: ChoiceGroupProps['defaultValue']): string[] {
  if (typeof defaultValue === 'string') return [defaultValue]
  return defaultValue ? [...defaultValue] : []
}

/**
 * A question with its answers as cards.
 *
 * `RadioGroup` is the compact form control: a circle and a word per line, for
 * a field among fields. This is the same `<fieldset>` and the same native
 * inputs — so it posts without JavaScript and autofills — with each option
 * grown to a card the reader can hit with a thumb and given room for a second
 * line. The checked state is carried on the card's class as well as on the
 * input, so the card can be styled without `:has()`.
 */
export function ChoiceGroup({
  legend,
  legendHidden,
  name,
  choices,
  multiple,
  defaultValue,
  onValueChange,
  columns = 1,
  help,
  error,
  required,
}: ChoiceGroupProps) {
  const groupId = useId()
  const helpId = `${groupId}-help`
  const errorId = `${groupId}-error`
  const [selected, setSelected] = useState<string[]>(() => initialSelection(defaultValue))

  function toggle(value: string, checked: boolean) {
    let next: string[]
    if (multiple) {
      next = checked ? [...selected, value] : selected.filter((v) => v !== value)
    } else {
      next = [value]
    }
    setSelected(next)
    onValueChange?.(next)
  }

  const describedBy =
    [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ') || undefined
  const classes = [
    'nav-choice-group',
    columns > 1 ? `nav-choice-group--cols-${columns}` : null,
    error ? 'nav-field--invalid' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    // `aria-required` is not allowed on a fieldset's implicit `group` role, so
    // a single choice takes `radiogroup`, which carries it. Several choices
    // have no role that does; their legend says "required" in words instead.
    <fieldset
      className={classes}
      role={multiple ? undefined : 'radiogroup'}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={required && !multiple ? true : undefined}
    >
      <legend className={legendHidden ? 'nav-choice-group__legend nav-visually-hidden' : 'nav-choice-group__legend'}>
        {legend}
        {required ? (
          <span className="nav-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
        {required && multiple ? <span className="nav-visually-hidden"> (required)</span> : null}
      </legend>
      <div className="nav-choice-group__options">
        {choices.map((choice) => {
          const id = `${groupId}-${choice.value}`
          const checked = selected.includes(choice.value)
          const cardClasses = [
            'nav-choice',
            checked ? 'is-checked' : null,
            choice.disabled ? 'is-disabled' : null,
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <label key={choice.value} className={cardClasses} htmlFor={id}>
              <input
                className="nav-choice__input"
                type={multiple ? 'checkbox' : 'radio'}
                id={id}
                name={name}
                value={choice.value}
                checked={checked}
                disabled={choice.disabled}
                // `required` on every radio in a group is how HTML says "one
                // of these"; on checkboxes it would mean "all of these".
                required={required && !multiple ? true : undefined}
                onChange={(event) => toggle(choice.value, event.target.checked)}
              />
              {choice.icon ? (
                <span className="nav-choice__icon" aria-hidden="true">
                  {choice.icon}
                </span>
              ) : null}
              <span className="nav-choice__text">
                <span className="nav-choice__label">{choice.label}</span>
                {choice.description ? (
                  <span className="nav-choice__description">{choice.description}</span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
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
    </fieldset>
  )
}

/* --------------------------------------------------------------- StepList -- */

export interface Step {
  /** Stable identifier; also the panel's key. */
  id: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}

export interface StepListProps {
  steps: ReadonlyArray<Pick<Step, 'id' | 'title'>>
  /** Zero-based. */
  current: number
  /** Names the list — "Intake progress". */
  label: string
  /**
   * Lets a completed step be revisited. Upcoming steps are never reachable
   * from here; the stepper's Continue is the only way forward, because that is
   * where the current step gets checked.
   */
  onSelect?: (index: number) => void
}

type StepState = 'done' | 'current' | 'upcoming'

function stepState(index: number, current: number): StepState {
  if (index < current) return 'done'
  return index === current ? 'current' : 'upcoming'
}

/**
 * Where the reader is, out of how many.
 *
 * An `<ol>` with `aria-current="step"`, which is the one ARIA value that means
 * exactly this. Completed steps are buttons when there is somewhere to send
 * the click; everything else is a span, so a keyboard user tabbing through
 * lands only on what does something.
 */
export function StepList({ steps, current, label, onSelect }: StepListProps) {
  return (
    <ol className="nav-steps" aria-label={label}>
      {steps.map((step, index) => {
        const state = stepState(index, current)
        const content = (
          <>
            <span className="nav-steps__marker" aria-hidden="true">
              {state === 'done' ? null : index + 1}
            </span>
            <span className="nav-steps__label">{step.title}</span>
            {state === 'done' ? <span className="nav-visually-hidden">, completed</span> : null}
          </>
        )
        return (
          <li
            key={step.id}
            className={`nav-steps__item is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {state === 'done' && onSelect ? (
              <button type="button" className="nav-steps__step" onClick={() => onSelect(index)}>
                {content}
              </button>
            ) : (
              <span className="nav-steps__step">{content}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------------------------------------------------------- Stepper -- */

export interface StepperProps {
  steps: readonly Step[]
  /** Names the progress list — "Intake progress". */
  label: string
  /** The current step, controlled. Pair with `onCurrentChange`. */
  current?: number
  /** Where to start when uncontrolled. */
  defaultCurrent?: number
  onCurrentChange?: (index: number) => void
  /**
   * Whether Continue is live. Defaults to true; a consumer that validates the
   * current step sets it from that. Back is always live — going back is safe.
   */
  canAdvance?: boolean
  /** The last step's primary action. */
  onComplete?: () => void
  /**
   * Make the last step's primary action a submit button, so the `<form>` the
   * stepper sits in posts. `button` by default, which calls `onComplete`.
   */
  finishType?: 'button' | 'submit'
  labels?: { back?: ReactNode; next?: ReactNode; finish?: ReactNode }
  /** Drop the progress list. The "Step 2 of 5" line above each title stays. */
  hideSteps?: boolean
}

/**
 * One step at a time.
 *
 * Every step is rendered and every step but the current one carries `hidden`.
 * Unmounting the others would be simpler and would lose the reader's answers
 * the moment they pressed Back — an uncontrolled `<input>` keeps its value
 * only while it exists. Kept in the tree, the whole flow is one `<form>` and
 * posts as one, which is also what makes `finishType="submit"` work.
 *
 * Moving between steps moves focus to the new step's first input (its title,
 * for a step with none). Without that, a keyboard or screen-reader user who
 * presses Continue is left on a button that now belongs to a different
 * question, with nothing to say the page changed.
 *
 * It registers its keys in the shortcut registry, so the `?` overlay lists
 * them: Mod+Enter advances (or submits on the last step) even from a text
 * field, Mod+Backspace and Alt+← go back, and 1–9 choose the matching radio or
 * checkbox when focus is not in a text field.
 */
function currentPanel(root: HTMLElement | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>('.nav-stepper__panel:not([hidden])') ?? null
}

function choiceInputs(panel: HTMLElement | null): HTMLInputElement[] {
  return Array.from(
    panel?.querySelectorAll<HTMLInputElement>('input[type=radio], input[type=checkbox]') ?? [],
  ).filter((input) => !input.disabled)
}

function firstInput(panel: HTMLElement | null): HTMLElement | null {
  return (
    panel?.querySelector<HTMLElement>(
      'input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    ) ?? null
  )
}

export function Stepper({
  steps,
  label,
  current,
  defaultCurrent = 0,
  onCurrentChange,
  canAdvance = true,
  onComplete,
  finishType = 'button',
  labels,
  hideSteps,
}: StepperProps) {
  const baseId = useId()
  const [internal, setInternal] = useState(defaultCurrent)
  const last = steps.length - 1
  const index = Math.max(0, Math.min(last, current ?? internal))
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRefs = useRef<Array<HTMLHeadingElement | null>>([])
  const previous = useRef(index)
  const [hasChoices, setHasChoices] = useState(false)
  const isLast = index === last

  useEffect(() => {
    const panel = currentPanel(rootRef.current)
    setHasChoices(choiceInputs(panel).length > 0)
    if (previous.current === index) return
    previous.current = index
    // The first input is where the reader's next keystroke belongs; a step
    // with none (a read-only summary) falls back to its title.
    ;(firstInput(panel) ?? titleRefs.current[index])?.focus()
  }, [index])

  function go(next: number) {
    const clamped = Math.max(0, Math.min(last, next))
    if (current === undefined) setInternal(clamped)
    onCurrentChange?.(clamped)
  }

  function advance() {
    if (!canAdvance) return
    if (!isLast) return go(index + 1)
    if (finishType === 'submit') rootRef.current?.closest('form')?.requestSubmit()
    else onComplete?.()
  }

  // Held in a field too: a modified Enter is a command, not text.
  useShortcut({
    key: 'Mod+Enter',
    description: 'Next question, or submit on the last',
    scope: 'page',
    allowInEditable: true,
    run: advance,
  })
  // Mod+Backspace and Alt+ArrowLeft are edit and navigation keys inside a text
  // field, so they go back only when focus is elsewhere.
  const back = index > 0 ? () => go(index - 1) : null
  useShortcut(
    back && { key: 'Mod+Backspace', description: 'Previous question', scope: 'page', run: back },
  )
  useShortcut(
    back && { key: 'Alt+ArrowLeft', description: 'Previous question', scope: 'page', run: back },
  )
  useShortcut(
    hasChoices
      ? {
          key: '1-9',
          description: 'Choose the numbered option',
          scope: 'page',
          run: (event) => choiceInputs(currentPanel(rootRef.current))[Number(event.key) - 1]?.click(),
        }
      : null,
  )

  if (steps.length === 0) return null

  return (
    <div className="nav-stepper" ref={rootRef}>
      {hideSteps ? null : <StepList steps={steps} current={index} label={label} onSelect={go} />}
      {steps.map((step, i) => {
        const titleId = `${baseId}-${i}`
        return (
          <section
            key={step.id}
            className="nav-stepper__panel"
            hidden={i !== index}
            aria-labelledby={titleId}
          >
            <p className="nav-stepper__count">
              Step {i + 1} of {steps.length}
            </p>
            <h2
              className="nav-stepper__title"
              id={titleId}
              tabIndex={-1}
              ref={(node) => {
                titleRefs.current[i] = node
              }}
            >
              {step.title}
            </h2>
            {step.description ? <p className="nav-stepper__description">{step.description}</p> : null}
            <div className="nav-stepper__body">{step.children}</div>
          </section>
        )
      })}
      <div className="nav-stepper__actions">
        {index > 0 ? (
          <NavButton variant="secondary" size="lg" onClick={() => go(index - 1)}>
            {labels?.back ?? 'Back'}
          </NavButton>
        ) : null}
        {isLast ? (
          <NavButton
            variant="primary"
            size="lg"
            type={finishType}
            disabled={!canAdvance}
            onClick={finishType === 'button' ? onComplete : undefined}
          >
            {labels?.finish ?? 'Finish'}
          </NavButton>
        ) : (
          <NavButton variant="primary" size="lg" disabled={!canAdvance} onClick={() => go(index + 1)}>
            {labels?.next ?? 'Continue'}
          </NavButton>
        )}
      </div>
    </div>
  )
}
