import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

/*
 * Accordion and Collapsible — shadcn's disclosure pair, on `<details>`.
 *
 * shadcn builds both on Radix, which reimplements the open/closed state, the
 * ARIA wiring, and the keyboard handling in JavaScript. `<details>`/`<summary>`
 * has all three in the platform: the browser owns the state, exposes it as a
 * real `aria-expanded` on a real button role, toggles on Enter and Space, and —
 * the part no JavaScript version gets — participates in in-page find, so
 * Ctrl+F opens the section containing the match.
 *
 * It also works with no hydration bundle, which the public pages need and a
 * Radix accordion cannot do.
 *
 * The trade against Radix is animation: `<details>` cannot transition its own
 * height without script. That is a fair price here — the design system has no
 * accordion animation to match.
 */

export interface AccordionItem {
  /** Stable identifier, used as the key and the default id. */
  id: string
  trigger: ReactNode
  children: ReactNode
  /**
   * Open on first render. Maps to the `open` attribute, which React writes at
   * mount and re-applies only when this prop changes — so the reader opening and
   * closing the section is not fought by a re-render. A link to the item, or to
   * anything inside it, opens it regardless.
   */
  defaultOpen?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  /**
   * Only one section open at a time. Implemented with a shared `name`, which is
   * the platform's own exclusive-accordion feature — no state, no effect. In a
   * browser without it every section simply stays independently openable, which
   * is a degradation nobody will notice.
   */
  exclusive?: boolean
  /** Shared `name` for the exclusive group. Defaults to a stable literal. */
  name?: string
}

/**
 * Open the item a link points into. When the address's fragment names an item,
 * or anything inside one, every `<details>` around the target is opened and the
 * target scrolled into view — on load and on each hash change. Browsers differ
 * on whether fragment navigation opens a closed `<details>`, so this does not
 * leave it to them.
 */
function useOpenOnFragment(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (!target || !root.current?.contains(target)) return
      for (let node = target.closest('details'); node; node = node.parentElement?.closest('details') ?? null) {
        node.open = true
      }
      target.scrollIntoView?.({ block: 'start' })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [root])
}

export function Accordion({ items, exclusive, name = 'nav-accordion' }: AccordionProps) {
  const ref = useRef<HTMLDivElement>(null)
  useOpenOnFragment(ref)
  return (
    <div className="nav-accordion" ref={ref}>
      {items.map((item) => (
        <details
          key={item.id}
          className="nav-accordion__item"
          id={item.id}
          name={exclusive ? name : undefined}
          open={item.defaultOpen}
        >
          <summary className="nav-accordion__trigger">{item.trigger}</summary>
          <div className="nav-accordion__panel">{item.children}</div>
        </details>
      ))}
    </div>
  )
}

export interface CollapsibleProps {
  trigger: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

/** A single disclosure. The accordion's one-item case, named for what it is. */
export function Collapsible({ trigger, children, defaultOpen }: CollapsibleProps) {
  return (
    <details className="nav-accordion__item" open={defaultOpen}>
      <summary className="nav-accordion__trigger">{trigger}</summary>
      <div className="nav-accordion__panel">{children}</div>
    </details>
  )
}
