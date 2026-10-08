import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { useDismissible } from '../lib/use-dismissible'

/*
 * Overlays — Dialog, Sheet, Popover, DropdownMenu, and Tooltip.
 *
 * shadcn gets all five from Radix. Radix is still not the answer here: the
 * modal pair is built on `<dialog>`, which brings the focus trap, the top
 * layer, the inert background, and Esc from the platform, and the three
 * non-modal ones share `useDismissible`.
 *
 * That hook now lives in `src/lib/use-dismissible.ts` rather than here, because
 * `Menus.tsx` needs the same three behaviors and a hook copied into a second
 * module is a hook that drifts.
 */

/* ----------------------------------------------------------------- Dialog -- */

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Sub-heading under the title. */
  description?: ReactNode
  children: ReactNode
  /** The action row along the bottom. */
  footer?: ReactNode
  /** Hide the corner close control on a dialog that must be answered. */
  hideClose?: boolean
}

/**
 * The generic modal.
 *
 * `ConfirmDelete` is this with one job and `role="alertdialog"`; this is the
 * open-ended one. Both are native `<dialog>` elements — see the note there for
 * why that beats a hand-rolled modal on four separate counts.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  hideClose,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    } else if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close()
    } else {
      dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="nav-dialog nav-card"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Keep React the source of truth for `open`; without this the DOM
        // closes behind it and the dialog cannot be reopened.
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <div className="nav-dialog__header">
        <h2 className="nav-dialog__title" id={titleId}>
          {title}
        </h2>
        {hideClose ? null : (
          <button
            type="button"
            className="nav-dialog__close"
            aria-label="Close"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {description ? (
        <p className="nav-dialog__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className="nav-dialog__body">{children}</div>
      {footer ? <div className="nav-dialog__footer">{footer}</div> : null}
    </dialog>
  )
}

/* ------------------------------------------------------------------ Sheet -- */

export interface SheetProps extends Omit<DialogProps, 'footer'> {
  side?: 'left' | 'right'
  footer?: ReactNode
}

/**
 * A dialog that arrives from the edge.
 *
 * The same native `<dialog>`, positioned against one side and full height. It
 * is a separate component rather than a `Dialog` variant because the two are
 * used for different things — a sheet holds a secondary surface the reader
 * moves through, a dialog holds a decision — and conflating them tends to
 * produce sheets that should have been pages.
 */
export function Sheet({ side = 'right', ...props }: SheetProps) {
  const { open, onClose, title, description, children, footer, hideClose } = props
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    } else if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close()
    } else {
      dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`nav-sheet nav-sheet--${side}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <div className="nav-dialog__header">
        <h2 className="nav-dialog__title" id={titleId}>
          {title}
        </h2>
        {hideClose ? null : (
          <button type="button" className="nav-dialog__close" aria-label="Close" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {description ? (
        <p className="nav-dialog__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className="nav-dialog__body">{children}</div>
      {footer ? <div className="nav-dialog__footer">{footer}</div> : null}
    </dialog>
  )
}

/* ---------------------------------------------------------------- Popover -- */

export interface PopoverProps {
  /** The control that opens it. Rendered inside a button. */
  trigger: ReactNode
  children: ReactNode
  /** Names the surface for assistive technology. */
  label: string
  align?: 'start' | 'end'
}

export function Popover({ trigger, children, label, align = 'start' }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const close = useCallback(() => setOpen(false), [])
  useDismissible({ open, onClose: close, triggerRef, contentRef })

  return (
    <div className="nav-popover">
      <button
        ref={triggerRef}
        type="button"
        className="nav-btn nav-btn--outline"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={contentRef}
          className={`nav-popover__content nav-popover__content--${align}`}
          id={id}
          role="dialog"
          aria-label={label}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------- DropdownMenu -- */

export interface MenuItem {
  /**
   * Stable identity for this entry. Falls back to `href`, then to the label
   * when it is a plain string — an array index would re-key every item below
   * one that is inserted or removed, which loses focus mid-menu.
   */
  id?: string
  label: ReactNode
  /** A link item navigates; give it an href. */
  href?: string
  /** An action item runs; give it onSelect. */
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: MenuItem[]
  label: string
  align?: 'start' | 'end'
}

/**
 * A menu of actions behind a button.
 *
 * `role="menu"` with `menuitem` children, and the arrow-key contract the role
 * promises — claiming the role without the keys is worse than not claiming it,
 * because a screen-reader user is told to expect arrows that do nothing.
 */
export function DropdownMenu({ trigger, items, label, align = 'start' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const id = useId()

  const close = useCallback(() => setOpen(false), [])
  useDismissible({ open, onClose: close, triggerRef, contentRef })

  const keyFor = (item: MenuItem, index: number) =>
    item.id ?? item.href ?? (typeof item.label === 'string' ? item.label : `item-${index}`)

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index !== -1)

  const focusItem = (position: number) => {
    const index = enabledIndexes[(position + enabledIndexes.length) % enabledIndexes.length]
    if (index !== undefined) itemRefs.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    const current = enabledIndexes.indexOf(
      itemRefs.current.findIndex((node) => node === document.activeElement),
    )
    if (event.key === 'ArrowDown') focusItem(current + 1)
    else if (event.key === 'ArrowUp') focusItem(current - 1)
    else if (event.key === 'Home') focusItem(0)
    else focusItem(enabledIndexes.length - 1)
  }

  const openAndFocusFirst = () => {
    setOpen(true)
    // The menu has not rendered yet; focus on the next frame.
    requestAnimationFrame(() => focusItem(0))
  }

  return (
    <div className="nav-menu">
      <button
        ref={triggerRef}
        type="button"
        className="nav-btn nav-btn--outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : openAndFocusFirst())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            openAndFocusFirst()
          }
        }}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={contentRef}
          className={`nav-menu__content nav-menu__content--${align}`}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
        >
          {items.map((item, index) =>
            item.href ? (
              <a
                key={keyFor(item, index)}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                className={item.destructive ? 'nav-menu__item nav-menu__item--danger' : 'nav-menu__item'}
                role="menuitem"
                href={item.href}
                tabIndex={-1}
                onClick={close}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={keyFor(item, index)}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                type="button"
                className={item.destructive ? 'nav-menu__item nav-menu__item--danger' : 'nav-menu__item'}
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.()
                  close()
                  triggerRef.current?.focus()
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Tooltip -- */

export interface TooltipProps {
  /** The tooltip text. Keep it short — this is a hint, not documentation. */
  content: ReactNode
  children: ReactNode
}

/**
 * A hint on hover and on focus.
 *
 * Focus as well as hover, always: a tooltip that only appears on hover is
 * invisible to a keyboard user and to anyone on a touch screen.
 *
 * The trigger is wired with `aria-describedby` rather than `aria-label`, so the
 * hint is read *in addition to* the control's own name instead of replacing it.
 * Never put the only copy of a control's name in a tooltip.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  const close = useCallback(() => setOpen(false), [])
  useDismissible({
    open,
    onClose: close,
    triggerRef: wrapperRef,
    contentRef,
    // Hover-driven: the reader's focus is wherever they left it, and yanking it
    // back to the trigger on Esc would be worse than doing nothing.
    restoreFocus: false,
  })

  return (
    <span
      ref={wrapperRef}
      className="nav-tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={close}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span ref={contentRef} className="nav-tooltip__content" role="tooltip" id={id}>
          {content}
        </span>
      ) : null}
    </span>
  )
}
