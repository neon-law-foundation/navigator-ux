import type { ReactNode } from 'react'

/*
 * Messages to the reader: toasts, flash banners, the disclaimer note, and the
 * impersonation banner.
 *
 * The ARIA is the substance of these components, not decoration on top of it.
 * A toast that renders without `role="alert"` is a message a screen-reader user
 * never receives, and it looks correct in every screenshot.
 */

export type ToastTone = 'primary' | 'success' | 'danger' | 'warning'

export interface ToastProps {
  tone?: ToastTone
  children: ReactNode
  /** Leading glyph or badge, before the body. */
  icon?: ReactNode
  /** Trailing control — a dismiss button, usually. */
  action?: ReactNode
}

/**
 * A single message in one of four tones.
 *
 * `role="alert"` carries an implicit `aria-live="assertive"`, so this interrupts
 * whatever a screen reader is saying. That is right for a toast, which is by
 * definition something that just happened, and wrong for a standing region —
 * see `ImpersonationBanner`.
 */
export function Toast({ tone = 'primary', children, icon, action }: ToastProps) {
  return (
    <div className={`nav-toast nav-toast--${tone}`} role="alert">
      {icon}
      <div className="nav-toast__body">{children}</div>
      {action}
    </div>
  )
}

export type FlashTone = 'success' | 'danger'

export interface FlashProps {
  tone: FlashTone
  children: ReactNode
}

/**
 * The banner above a page after a redirect — the `?notice=` / `?error=` message.
 *
 * Distinct from `Toast` because it arrives with the document rather than during
 * it. It is still an alert: it is the only report the reader gets that the
 * thing they submitted worked.
 */
export function Flash({ tone, children }: FlashProps) {
  return (
    <p className={`nav-flash nav-flash--${tone}`} role="alert">
      {children}
    </p>
  )
}

export interface AlertProps {
  title?: ReactNode
  children: ReactNode
  /**
   * Announce it. Off by default: the legal disclaimer is standing text that
   * every page carries, and announcing it on every navigation is noise.
   */
  live?: boolean
}

/**
 * The bordered warning surface the legal disclaimer wears.
 *
 * A `<section>` with an accessible name rather than a bare `<div>`, so the
 * disclaimer shows up in a screen reader's landmark list — which is how a
 * reader who wants to find it, finds it.
 */
export function Alert({ title, children, live }: AlertProps) {
  return (
    <section className="nav-alert" role={live ? 'alert' : undefined} aria-label={title ? undefined : 'Notice'}>
      {title ? <h2 className="nav-alert__title">{title}</h2> : null}
      <div className="nav-alert__body">{children}</div>
    </section>
  )
}

export interface LegalDisclaimerProps {
  /** Defaults to the standard heading. */
  title?: ReactNode
  children: ReactNode
}

/** The standing legal note. `Alert` with the disclaimer's default heading. */
export function LegalDisclaimer({ title = 'Legal notice', children }: LegalDisclaimerProps) {
  return <Alert title={title}>{children}</Alert>
}

export interface ImpersonationBannerProps {
  /** The person being acted as. */
  name: ReactNode
  email?: ReactNode
  /** The way out. A form post, not a link — it changes server state. */
  stopAction: string
  stopLabel?: string
  /** CSRF or any other hidden fields the stop endpoint requires. */
  hiddenFields?: Record<string, string>
}

/**
 * Shown on every page an impersonating admin sees.
 *
 * When an admin acts as a client, every page says so and offers the way out.
 * That is why it is `role="status"` and not `role="alert"`: it is a standing
 * condition, announced politely once, rather than an event that should
 * interrupt. And why the stop control is a form — ending an impersonation
 * session is a state change, and a link that mutates state is a link a
 * prefetcher can fire on its own.
 */
export function ImpersonationBanner({
  name,
  email,
  stopAction,
  stopLabel = 'Stop impersonating',
  hiddenFields,
}: ImpersonationBannerProps) {
  return (
    <div className="impersonation-banner" role="status">
      <span>
        You are acting as <strong>{name}</strong>
      </span>
      {email ? <span className="impersonation-banner__email">{email}</span> : null}
      <form className="impersonation-banner__stop" method="post" action={stopAction}>
        {Object.entries(hiddenFields ?? {}).map(([fieldName, value]) => (
          <input key={fieldName} type="hidden" name={fieldName} value={value} />
        ))}
        <button type="submit" className="nav-btn nav-btn--outline">
          {stopLabel}
        </button>
      </form>
    </div>
  )
}
