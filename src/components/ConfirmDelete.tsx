import { useEffect, useId, useRef, type ReactNode } from 'react'

/*
 * Destructive-action confirmation.
 *
 * A native `<dialog>` carrying `role="alertdialog"`, never `window.confirm()`.
 * The native element brings the focus trap, the Esc key, the top layer, and the
 * inertness of everything behind it — four things a hand-rolled modal gets
 * wrong in four separate ways. `confirm()` brings none of them, cannot be
 * styled, blocks the main thread, and is silently suppressed in some
 * embedded contexts, where it returns `false` and the delete quietly never
 * happens.
 *
 * `alertdialog` rather than `dialog` because the reader is being asked to
 * confirm a consequence: it tells a screen reader to announce the message
 * immediately rather than waiting to be explored.
 */

export interface ConfirmDeleteProps {
  open: boolean
  title: ReactNode
  /** What is about to be destroyed, and whether it comes back. */
  message: ReactNode
  /** Where the confirmation posts. A form, because it changes server state. */
  action: string
  /** CSRF and any other fields the endpoint requires. */
  hiddenFields?: Record<string, string>
  confirmLabel?: string
  cancelLabel?: string
  /** Esc, the backdrop, and the Cancel button all route here. */
  onCancel: () => void
}

export function ConfirmDelete({
  open,
  title,
  message,
  action,
  hiddenFields,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onCancel,
}: ConfirmDeleteProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      // `showModal` is what puts the dialog in the top layer and makes the rest
      // of the document inert. Setting the `open` attribute instead renders a
      // non-modal dialog that looks identical and traps nothing, so prefer the
      // method and fall back only where it does not exist.
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
      className="confirm-delete nav-card"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      // Fires for Esc as well as `close()`. Without this the React `open` prop
      // and the DOM disagree after an Esc, and the dialog cannot be reopened.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClose={onCancel}
    >
      <div className="nav-card__body">
        <h2 className="confirm-delete__title" id={titleId}>
          {title}
        </h2>
        <p className="confirm-delete__message" id={messageId}>
          {message}
        </p>
        <div className="confirm-delete__actions">
          <form className="confirm-delete__form" method="post" action={action}>
            {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button type="submit" className="nav-btn nav-btn--danger">
              {confirmLabel}
            </button>
          </form>
          <button type="button" className="nav-btn nav-btn--outline" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
