import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import {
  defaultShortcutRegistry,
  formatKey,
  type Shortcut,
  type ShortcutEntry,
  type ShortcutRegistry,
  type ShortcutScope,
} from '../lib/shortcuts'
import { Dialog } from './Overlay'

/*
 * Keyboard shortcuts — the provider, the registration hook, and the `?` overlay.
 *
 * `NavigatorShell` mounts `ShortcutHost`, so a page gets the overlay and the
 * keydown listener without wiring anything. A page then declares what it
 * answers to with `useShortcut`; the overlay lists exactly what the registry
 * holds at that moment, so leaving a page takes its shortcuts off the list.
 */

const ShortcutContext = createContext<ShortcutRegistry>(defaultShortcutRegistry)

export interface ShortcutProviderProps {
  registry: ShortcutRegistry
  children: ReactNode
}

/** Supply a registry other than the default, so a test or an embedded app can keep its own. */
export function ShortcutProvider({ registry, children }: ShortcutProviderProps) {
  return <ShortcutContext.Provider value={registry}>{children}</ShortcutContext.Provider>
}

/** The registry in scope. */
export function useShortcutRegistry(): ShortcutRegistry {
  return useContext(ShortcutContext)
}

/**
 * Register a shortcut for as long as the calling component is mounted.
 *
 * The handler may close over fresh state on every render: registration is keyed
 * on the key, description, scope and editable-field policy, and the latest `run`
 * is read at press time, so a changing closure never re-registers (and never
 * reorders the overlay).
 */
export function useShortcut(shortcut: Shortcut | null): void {
  const registry = useShortcutRegistry()
  const run = useRef<Shortcut['run']>(() => {})
  const latest = shortcut?.run
  useEffect(() => {
    if (latest) run.current = latest
  })

  const key = shortcut?.key
  const description = shortcut?.description
  const scope = shortcut?.scope
  const allowInEditable = shortcut?.allowInEditable

  useEffect(() => {
    if (key === undefined || description === undefined || scope === undefined) return
    return registry.register({
      key,
      description,
      scope,
      allowInEditable,
      run: (event) => run.current(event),
    })
  }, [registry, key, description, scope, allowInEditable])
}

/** The registry's current list, re-read whenever it changes. */
export function useShortcutList(): readonly ShortcutEntry[] {
  const registry = useShortcutRegistry()
  return useSyncExternalStore(registry.subscribe, registry.list, registry.list)
}

const SCOPE_HEADINGS: Record<ShortcutScope, string> = {
  global: 'Everywhere',
  page: 'On this page',
}

export interface ShortcutListProps {
  shortcuts: readonly ShortcutEntry[]
  /** Passed through to `formatKey`; the reader's platform when omitted. */
  platform?: string
}

/** The shortcuts, grouped by scope — one definition list per scope that has any. */
export function ShortcutList({ shortcuts, platform }: ShortcutListProps) {
  const headingId = useId()
  const scopes = (['global', 'page'] as const).filter((scope) =>
    shortcuts.some((shortcut) => shortcut.scope === scope),
  )
  if (scopes.length === 0) return <p className="nav-text-muted">No shortcuts are registered.</p>
  return (
    <div className="nav-shortcuts">
      {scopes.map((scope) => (
        <section key={scope} aria-labelledby={`${headingId}-${scope}`}>
          <h3 className="nav-shortcuts__scope" id={`${headingId}-${scope}`}>
            {SCOPE_HEADINGS[scope]}
          </h3>
          <dl className="nav-shortcuts__list">
            {shortcuts
              .filter((shortcut) => shortcut.scope === scope)
              .map((shortcut) => (
                <div className="nav-shortcuts__row" key={`${scope}:${shortcut.key}`}>
                  <dt>{shortcut.description}</dt>
                  <dd>
                    {formatKey(shortcut.key, platform).map((cap) => (
                      <kbd className="nav-kbd" key={cap}>
                        {cap}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

/** The overlay itself: a labelled modal dialog listing the registry. */
export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shortcuts = useShortcutList()
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <ShortcutList shortcuts={shortcuts} />
    </Dialog>
  )
}

/**
 * Listens for keys on the document, registers `?`, and renders the overlay.
 *
 * `NavigatorShell` renders one. It is exported for a surface that has its own
 * frame but wants the same behavior. While the overlay is open it owns the
 * keyboard: the dialog is modal, so a shortcut firing on the page behind it
 * would act on something the reader cannot see.
 */
export function ShortcutHost() {
  const registry = useShortcutRegistry()
  const [open, setOpen] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  })

  const show = useCallback(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
    // The platform restores focus when a modal `<dialog>` closes; doing it here
    // as well covers environments that do not, and a trigger that has since
    // been removed is skipped rather than throwing.
    const target = returnFocus.current
    returnFocus.current = null
    if (target?.isConnected) target.focus()
  }, [])

  useEffect(
    () =>
      registry.register({
        key: '?',
        description: 'Show keyboard shortcuts',
        scope: 'global',
        run: show,
      }),
    [registry, show],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (openRef.current) {
        // The dialog's native cancel also closes it on a real Esc; closing here
        // as well makes Esc dependable wherever the platform event is absent.
        if (event.key === 'Escape') hide()
        return
      }
      registry.handle(event)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [registry, hide])

  return <ShortcutHelp open={open} onClose={hide} />
}
