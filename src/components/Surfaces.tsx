import type { ReactElement, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { initialsFor } from '../lib/initials'

/*
 * Shared surfaces — the card and the two marketing cards built on it.
 *
 * Every component here obeys the three contracts:
 *
 *   The leaf rule.    Nothing imports a router, a session, application state,
 *                     or a data client. Data and callbacks arrive as props.
 *   Injected links.   A navigable component takes an `href` and renders a
 *                     plain anchor. A caller wanting client-side navigation
 *                     supplies it at the call site.
 *   Brand tokens.     Only semantic class names. No inline color, ever — a
 *                     literal here would pin one brand's identity into code
 *                     that three brands consume.
 */

/* ------------------------------------------------------------------- Card -- */

export interface CardProps {
  /** A decorative local glyph above the card content. Hidden from assistive technology. */
  icon?: IconName | ReactElement
  /** The card's title. Omit for a card that is only a body. */
  header?: ReactNode
  /** A muted line under the title. */
  description?: ReactNode
  footer?: ReactNode
  /**
   * The brand-anchored "this one" treatment: the border takes the brand color
   * and the header becomes a band filled with it.
   */
  highlighted?: boolean
  /** Center the body — used by short, single-statement cards. */
  centered?: boolean
  children: ReactNode
  className?: string
  id?: string
}

/** The design system's shared surface. */
export function Card({
  icon,
  header,
  description,
  footer,
  highlighted,
  centered,
  children,
  className,
  id,
}: CardProps) {
  const classes = ['nav-card', highlighted ? 'nav-card--highlighted' : null, className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} id={id}>
      {icon ? (
        <div className="nav-card__icon" aria-hidden="true">
          {typeof icon === 'string' ? <Icon name={icon} /> : icon}
        </div>
      ) : null}
      {header || description ? (
        <div className="nav-card__header">
          {header}
          {description ? <p className="nav-card__description">{description}</p> : null}
        </div>
      ) : null}
      <div className={centered ? 'nav-card__body nav-card__body--center' : 'nav-card__body'}>
        {children}
      </div>
      {footer ? <div className="nav-card__footer">{footer}</div> : null}
    </section>
  )
}

/* ------------------------------------------------------------ PricingCard -- */

export interface PricingCardProps {
  /** The plan name, in the header — a filled band when `recommended`. */
  name: ReactNode
  /** The headline figure — "$4,500", "Free". Rendered at display size. */
  amount: ReactNode
  /** The unit under the figure: "per month", "per matter". */
  period?: ReactNode
  /** Framing sentence above the feature list. */
  summary?: ReactNode
  features?: string[]
  /** The call to action. Omit for a plan with nothing to click. */
  cta?: { label: string; href: string }
  /** Marks the recommended plan — the brand-filled band. */
  recommended?: boolean
}

/**
 * One plan in a pricing grid.
 *
 * Every card wears the brand border; `recommended` is what fills the band. The
 * cards are flex columns so the CTA pins to the bottom and a row of them lines
 * up however uneven the feature lists are.
 */
export function PricingCard({
  name,
  amount,
  period,
  summary,
  features,
  cta,
  recommended,
}: PricingCardProps) {
  const classes = ['nav-card', 'pricing-card', recommended ? 'nav-card--highlighted' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <div className={recommended ? 'nav-card__header pricing-card__band' : 'nav-card__header'}>
        {name}
      </div>
      <div className="nav-card__body pricing-card__body">
        <p className="pricing-card__amount">{amount}</p>
        {period ? <p className="nav-text-muted">{period}</p> : null}
        {summary ? <p>{summary}</p> : null}
        {features?.length ? (
          <ul className="pricing-card__features">
            {features.map((feature) => (
              <li key={feature}>
                <span className="pricing-card__check">
                  <Icon name="check-lg" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        ) : null}
        {cta ? (
          <a className="nav-btn nav-btn--primary pricing-card__cta" href={cta.href}>
            {cta.label}
          </a>
        ) : null}
      </div>
    </section>
  )
}

export interface PricingGridProps {
  children: ReactNode
  /**
   * Columns above 62rem. Below it the grid is a single column regardless — a
   * pricing table that side-scrolls on a phone is a pricing table nobody reads.
   */
  columns?: number
}

export function PricingGrid({ children, columns }: PricingGridProps) {
  // A custom property rather than a class per count: the stylesheet reads
  // `var(--pricing-cols, 3)`, so any number works without a matching rule.
  return (
    <div
      className="pricing-grid"
      style={columns ? ({ '--pricing-cols': columns } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------- TestimonialCard -- */

export interface TestimonialCardProps {
  /** Small uppercase kicker above the quote — the matter type, say. */
  label?: ReactNode
  quote: ReactNode
  /** Who said it. */
  name: ReactNode
  /** Their role and organization, under the name. */
  title?: ReactNode
  /** Portrait URL. Without one the card falls back to drawn initials. */
  avatarUrl?: string
  /**
   * Initials for the fallback avatar. Derived from `name` when omitted, which
   * only works for a plain-string name.
   */
  initials?: string
}

export function TestimonialCard({
  label,
  quote,
  name,
  title,
  avatarUrl,
  initials,
}: TestimonialCardProps) {
  // Only a string name can yield initials; a ReactNode cannot be read.
  const fallback = initials ?? (typeof name === 'string' ? initialsFor(name) : '')

  return (
    <section className="nav-card testimonial-card">
      <div className="nav-card__body testimonial-card__body">
        {label ? <p className="testimonial-card__label">{label}</p> : null}
        <blockquote className="testimonial-card__quote">{quote}</blockquote>
        <div className="testimonial-card__by">
          {avatarUrl ? (
            // Decorative: the name sits right beside it, so alt text would be
            // the same words twice to a screen reader.
            <img className="testimonial-card__avatar" src={avatarUrl} alt="" />
          ) : (
            <span
              className="testimonial-card__avatar testimonial-card__avatar--initials"
              aria-hidden="true"
            >
              {fallback}
            </span>
          )}
          <div>
            <p className="testimonial-card__name">{name}</p>
            {title ? <p className="nav-text-muted">{title}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export function TestimonialGrid({ children }: { children: ReactNode }) {
  return <div className="testimonial-grid">{children}</div>
}

export interface TestimonialSectionProps {
  heading?: ReactNode
  intro?: ReactNode
  children: ReactNode
}

export function TestimonialSection({ heading, intro, children }: TestimonialSectionProps) {
  return (
    <section className="testimonial-section">
      {heading || intro ? (
        <div className="testimonial-section__head">
          {heading ? <h2>{heading}</h2> : null}
          {intro ? <p>{intro}</p> : null}
        </div>
      ) : null}
      <TestimonialGrid>{children}</TestimonialGrid>
    </section>
  )
}
