import { useId, type ReactNode } from 'react'
import { ExternalLink } from './Navigation'
import type { NavigationHrefs } from '../lib/navigation-chords'
import { NavigationChords, ShortcutHost } from './Shortcuts'

/*
 * Page chrome: the public header and footer, the public shell, the
 * authenticated Navigator shell, and the page header inside them.
 *
 * Nothing here imports a router or a session. Destinations arrive as arrays of
 * `{ label, href }` and the caller marks which one is current. That is what
 * lets the same header render a server-only marketing page with no hydration
 * bundle and an authenticated React portal.
 */

export interface ChromeLink {
  label: ReactNode
  href: string
  /** The reader's current page. */
  current?: boolean
  /** Leaves the site: a new tab, `rel="noopener noreferrer"`, and the outward glyph. */
  external?: boolean
}

function ChromeAnchor({ link, className }: { link: ChromeLink; className?: string }) {
  const current = link.current ? 'page' : undefined
  if (link.external) {
    return (
      <ExternalLink href={link.href} className={className} aria-current={current}>
        {link.label}
      </ExternalLink>
    )
  }
  return (
    <a className={className} href={link.href} aria-current={current}>
      {link.label}
    </a>
  )
}

/**
 * Shared empty default for every optional link array below.
 *
 * A `= []` default constructs a new array on every render, so a memoized child
 * receiving it re-renders every time its parent does. One frozen instance costs
 * nothing and is referentially stable.
 */
const NO_LINKS: readonly ChromeLink[] = Object.freeze([])
const NO_OFFICES: readonly FooterOffice[] = Object.freeze([])

function linkKey(link: ChromeLink, index: number) {
  return typeof link.label === 'string' ? `${link.href}:${link.label}` : `${link.href}:${index}`
}

/* ------------------------------------------------------------- SiteHeader -- */

export interface SiteHeaderProps {
  brand: ReactNode
  brandHref?: string
  /** A logo mark before the wordmark. */
  logo?: ReactNode
  /** Primary destinations. */
  links?: readonly ChromeLink[]
  /** The trailing group: Sign in, or Portal / Staff / Sign out. */
  utility?: readonly ChromeLink[]
  menuLabel?: string
  'aria-label'?: string
}

/**
 * The public marketing header.
 *
 * Below 48rem the two link rows collapse behind a burger, and the disclosure is
 * a hidden checkbox rather than a script — these pages ship no hydration
 * bundle, so there is no JavaScript to open a menu with. The checkbox is
 * positioned off-screen instead of `display: none` so it stays focusable: a
 * menu you cannot tab to is not a menu.
 */
export function SiteHeader({
  brand,
  brandHref = '/',
  logo,
  links = NO_LINKS,
  utility = NO_LINKS,
  menuLabel = 'Menu',
  'aria-label': ariaLabel = 'Primary',
}: SiteHeaderProps) {
  const toggleId = useId()

  return (
    <header className="site-header">
      <nav className="site-header__nav" aria-label={ariaLabel}>
        <a className="site-header__brand" href={brandHref}>
          {logo ? <span className="site-header__logo">{logo}</span> : null}
          {brand}
        </a>

        <input
          className="site-header__toggle"
          type="checkbox"
          id={toggleId}
          // The input carries the semantics; the <label> below is what the
          // reader sees and clicks.
          aria-label={menuLabel}
        />
        <label className="site-header__burger" htmlFor={toggleId}>
          <span className="site-header__burger-bar" />
          <span className="site-header__burger-bar" />
          <span className="site-header__burger-bar" />
        </label>

        {links.length > 0 ? (
          <ul className="site-header__links">
            {links.map((link, index) => (
              <li key={linkKey(link, index)}>
                <ChromeAnchor
                  link={link}
                  className={
                    link.current ? 'site-header__link site-header__link--active' : 'site-header__link'
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}

        {utility.length > 0 ? (
          <ul className="site-header__utility">
            {utility.map((link, index) => (
              <li key={linkKey(link, index)}>
                <ChromeAnchor
                  link={link}
                  className={
                    link.current ? 'site-header__link site-header__link--active' : 'site-header__link'
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}
      </nav>
    </header>
  )
}

/* ------------------------------------------------------------- SiteFooter -- */

export interface FooterOffice {
  /** The heading above the address — usually the state. */
  label: ReactNode
  address: ReactNode
  /** A qualification: an admission that has not come through yet. */
  note?: ReactNode
}

export interface SiteFooterProps {
  /** The contact band's call to action. */
  cta?: { label: string; href: string }
  phone?: { label: ReactNode; href: string }
  offices?: readonly FooterOffice[]
  /** Secondary destinations — Team, Blog, Contact. */
  links?: readonly ChromeLink[]
  /** The fine print: regulated entity, admissions, disclaimer, copyright. */
  legal?: ReactNode
  /**
   * The Foundation variant adds the §6104(d) public-disclosure link to the
   * reach column.
   */
  transparency?: { label: string; href: string }
  'aria-label'?: string
}

export function SiteFooter({
  cta,
  phone,
  offices = NO_OFFICES,
  links = NO_LINKS,
  legal,
  transparency,
  'aria-label': ariaLabel = 'Site footer',
}: SiteFooterProps) {
  const hasContact = Boolean(cta || phone || transparency || offices.length)

  return (
    <footer className="site-footer" aria-label={ariaLabel}>
      <div className="site-footer__inner">
        {links.length > 0 ? (
          <nav className="site-footer__nav" aria-label="Footer">
            {links.map((link, index) => (
              <ChromeAnchor key={linkKey(link, index)} link={link} className="site-footer__nav-link" />
            ))}
          </nav>
        ) : null}

        {hasContact ? (
          <div className="site-footer__contact">
            <div className="site-footer__reach">
              {cta ? (
                <a className="nav-btn nav-btn--primary" href={cta.href}>
                  {cta.label}
                </a>
              ) : null}
              {phone ? (
                <a className="site-footer__phone" href={phone.href}>
                  {phone.label}
                </a>
              ) : null}
              {transparency ? (
                <a className="site-footer__transparency" href={transparency.href}>
                  {transparency.label}
                </a>
              ) : null}
            </div>

            {offices.length > 0 ? (
              <div className="site-footer__offices">
                {offices.map((office, index) => (
                  <div
                    key={typeof office.label === 'string' ? office.label : index}
                    className="site-footer__office"
                  >
                    <p className="site-footer__office-label">{office.label}</p>
                    {/* <address> defaults to italic; these are postal
                        addresses, not asides. The stylesheet undoes it. */}
                    <address className="site-footer__office-address">{office.address}</address>
                    {office.note ? <p className="site-footer__office-note">{office.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {legal ? <div className="site-footer__legal">{legal}</div> : null}
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------ PublicShell -- */

export interface ShellFrameProps {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** Frame it as a contained sample — the `/design` preview treatment. */
  showcase?: boolean
}

/**
 * The skeleton a public page wraps its content in: header, a centered content
 * column, and the footer strip.
 */
export function PublicShell({ header, footer, children, showcase }: ShellFrameProps) {
  const shell = (
    <div className="public-shell nav-theme">
      {header}
      <main className="public-shell__main">{children}</main>
      {footer}
    </div>
  )

  return showcase ? <div className="public-shell-showcase">{shell}</div> : shell
}

/* --------------------------------------------------------- NavigatorShell -- */

export interface NavigatorNavbarProps {
  brand: ReactNode
  brandHref?: string
  /**
   * A brand mark before the wordmark — a Project's resolved-brand logo, say.
   * `brand` itself is unaffected: a portal's title stays fixed even when the
   * mark next to it changes from matter to matter.
   */
  logo?: ReactNode
  /** Role-appropriate destinations — client, staff, or admin. */
  destinations?: readonly ChromeLink[]
  /** The sign-out control. A form, because it ends a session. */
  signOut?: { label?: string; action: string; hiddenFields?: Record<string, string> }
  'aria-label'?: string
}

/**
 * The authenticated application bar.
 *
 * It takes its destinations rather than deriving them, so the same bar renders
 * the client, staff, and admin forms and this component never learns what a
 * role is. Deciding who sees what is an authorization question, and a component
 * that answered it would be answering it in the browser.
 *
 * `logo` mirrors `SiteHeader`'s own leading mark: an optional node rendered
 * before the wordmark, sized by whatever the caller passes. A Project portal
 * wires it to its resolved brand's logo asset while `brand` keeps reading
 * "Navigator" — the mark identifies whose matter this is, the wordmark
 * identifies the product.
 */
export function NavigatorNavbar({
  brand,
  brandHref = '/',
  logo,
  destinations = NO_LINKS,
  signOut,
  'aria-label': ariaLabel = 'Primary',
}: NavigatorNavbarProps) {
  return (
    <div className="navigator-chrome__header">
      <nav className="navigator-navbar" aria-label={ariaLabel}>
        <a className="navigator-navbar__brand" href={brandHref}>
          {logo ? <span className="navigator-navbar__logo">{logo}</span> : null}
          {brand}
        </a>
        {destinations.length > 0 ? (
          <ul className="navigator-navbar__destinations">
            {destinations.map((link, index) => (
              <li key={linkKey(link, index)}>
                <a
                  className={
                    link.current
                      ? 'navigator-navbar__link navigator-navbar__link--active'
                      : 'navigator-navbar__link'
                  }
                  href={link.href}
                  aria-current={link.current ? 'page' : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {signOut ? (
          <form method="post" action={signOut.action} className="navigator-navbar__sign-out-form">
            {Object.entries(signOut.hiddenFields ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button type="submit" className="navigator-navbar__sign-out nav-btn">
              {signOut.label ?? 'Sign out'}
            </button>
          </form>
        ) : null}
      </nav>
    </div>
  )
}

/** One brand the resolved Firm wears, for the footer's identity row. */
export interface NavigatorFooterBrand {
  label: ReactNode
  /** Omitted for a brand with no dedicated host to link to yet. */
  href?: string
  /** The brand's own mark, sized by whatever the caller passes. */
  logo?: ReactNode
  /** The brand this portal (or this request) is currently wearing. */
  current?: boolean
}

const NO_BRANDS: readonly NavigatorFooterBrand[] = Object.freeze([])

/**
 * The fixed platform attribution line.
 *
 * Not a prop, and never overridden by a caller: `legal` is the host's own
 * line, this is the library's. A brand's identity is data (its name, its
 * logo, the Firm it links to); the fact that Navigator renders it is not.
 */
export const POWERED_BY_NEON_LAW_NAVIGATOR = 'Powered by Neon Law Navigator'

export interface NavigatorFooterProps {
  legal?: ReactNode
  /**
   * Every brand the resolved Firm wears, current one first — the same shape
   * `webapp::firm_footer::FirmFooterModel` gives Navigator's own `/app`
   * chrome. Identity only (name, link, logo): a brand's *color* stays the
   * separate token-layer mechanism this library documents, never a prop here.
   */
  brands?: readonly NavigatorFooterBrand[]
  links?: readonly ChromeLink[]
  /** The running deploy — a release tag or commit. */
  release?: ReactNode
}

export function NavigatorFooter({
  legal,
  brands = NO_BRANDS,
  links = NO_LINKS,
  release,
}: NavigatorFooterProps) {
  return (
    <footer className="navigator-footer">
      {legal || brands.length > 0 ? (
        <div className="navigator-footer__identity">
          {legal ? <p className="navigator-footer__legal">{legal}</p> : null}
          {brands.length > 0 ? (
            <ul className="navigator-footer__brands">
              {brands.map((brand, index) => (
                <li
                  key={typeof brand.label === 'string' ? brand.label : index}
                  className="navigator-footer__brand"
                >
                  {brand.logo ? (
                    <span className="navigator-footer__brand-logo">{brand.logo}</span>
                  ) : null}
                  {brand.href && !brand.current ? (
                    <a
                      className="navigator-footer__brand-link"
                      href={brand.href}
                      aria-current={brand.current ? 'page' : undefined}
                    >
                      {brand.label}
                    </a>
                  ) : (
                    <span aria-current={brand.current ? 'page' : undefined}>{brand.label}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <p className="navigator-footer__powered-by">{POWERED_BY_NEON_LAW_NAVIGATOR}</p>
      {links.length > 0 ? (
        <nav className="navigator-footer__links" aria-label="Footer">
          {links.map((link, index) => (
            <ChromeAnchor key={linkKey(link, index)} link={link} />
          ))}
        </nav>
      ) : null}
      {release ? <p className="navigator-footer__release">{release}</p> : null}
    </footer>
  )
}

/**
 * The authenticated frame: navbar, content column, footer.
 *
 * It also hosts the keyboard-shortcut overlay (`?`), so every page that wears
 * the shell gets it with no wiring of its own. A `showcase` frame is a sample,
 * not a live page, and stays quiet.
 */
export function NavigatorShell({
  header,
  footer,
  children,
  showcase,
  chords,
}: ShellFrameProps & {
  /** Where this portal's pages live, for the `g`-chords. A page left out has no chord. */
  chords?: NavigationHrefs
}) {
  const shell = (
    <div className="navigator-shell nav-theme">
      {header}
      <main className="navigator-shell__main">{children}</main>
      {footer}
      {showcase ? null : (
        <>
          <ShortcutHost />
          {chords ? <NavigationChords hrefs={chords} /> : null}
        </>
      )}
    </div>
  )

  return showcase ? <div className="navigator-chrome-showcase">{shell}</div> : shell
}

/* ------------------------------------------------------------- PageHeader -- */

export interface PageHeaderProps {
  title: ReactNode
  /** A line under the title. */
  summary?: ReactNode
  /** Right-aligned controls — the "New entity" button, say. */
  actions?: ReactNode
}

/** An `<h1>` with its actions to the right. Wraps on narrow viewports. */
export function PageHeader({ title, summary, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {summary ? <p className="nav-text-muted">{summary}</p> : null}
      </div>
      {actions}
    </div>
  )
}
