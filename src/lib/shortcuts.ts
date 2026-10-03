/*
 * The keyboard-shortcut registry — the one list every shortcut is declared in.
 *
 * A page registers what it answers to as a key, a description, and a scope, and
 * the `?` help overlay renders straight from this list. Because the overlay
 * reads the registry rather than a second hand-kept table, a shortcut that works
 * is a shortcut that is listed, and a listed one works.
 *
 * Keys are written the way a person reads them: `?`, `1`, `Mod+Enter`,
 * `Alt+ArrowLeft`. A digit range such as `1-9` is one registration for the
 * whole row of keys, listed once. `Mod` is ⌘ on Apple platforms and Ctrl elsewhere, so a
 * registration is written once and shown in the reader's own vocabulary.
 */

/** `global` shortcuts work on every page; `page` shortcuts only while it is open. */
export type ShortcutScope = 'global' | 'page'

export interface Shortcut {
  /** The key, in the notation above. Unique within a scope. */
  key: string
  /** What it does, in a few words — the overlay's row label. */
  description: string
  scope: ShortcutScope
  /** Runs when the key is pressed. `event` has already had `preventDefault` applied. */
  run: (event: KeyboardEvent) => void
  /**
   * Fire even while focus is in a text field. Off by default: a bare letter or
   * digit in a field is typing, not a command. A modified key such as
   * `Mod+Enter` is not typing, so it opts in.
   */
  allowInEditable?: boolean
}

/** What the overlay shows: a registration without its handler. */
export type ShortcutEntry = Pick<Shortcut, 'key' | 'description' | 'scope'>

export interface ShortcutRegistry {
  /** Add a shortcut; the returned function removes exactly that registration. */
  register: (shortcut: Shortcut) => () => void
  /** Every registered shortcut, global before page, in registration order. */
  list: () => readonly ShortcutEntry[]
  /** Called after every change to the list. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void
  /** Offer a keydown to the registry; true when a shortcut handled it. */
  handle: (event: KeyboardEvent) => boolean
}

interface ParsedKey {
  mod: boolean
  alt: boolean
  shift: boolean
  key: string
}

const MODIFIERS = new Set(['mod', 'alt', 'shift'])

export function parseKey(spec: string): ParsedKey {
  // The key is whatever follows the last `+`, except that `+` is itself a key.
  const plus = spec === '+' || spec.endsWith('++')
  const key = plus ? '+' : spec.slice(spec.lastIndexOf('+') + 1)
  const head = plus ? spec.slice(0, -1) : spec.slice(0, Math.max(spec.lastIndexOf('+'), 0))
  const names = head === '' ? [] : head.split('+').map((part) => part.toLowerCase())
  for (const name of names) {
    if (!MODIFIERS.has(name)) throw new Error(`Unknown modifier "${name}" in shortcut "${spec}"`)
  }
  return {
    mod: names.includes('mod'),
    alt: names.includes('alt'),
    shift: names.includes('shift'),
    key,
  }
}

/** True when the keydown is the key `spec` names. */
export function matchesKey(spec: string, event: KeyboardEvent): boolean {
  const parsed = parseKey(spec)
  const mod = event.metaKey || event.ctrlKey
  if (parsed.mod !== mod || parsed.alt !== event.altKey) return false
  // A printable character already encodes Shift (`?` is Shift+/), so only a
  // named key such as Enter has a Shift state worth comparing.
  const range = /^(\d)-(\d)$/.exec(parsed.key)
  if (parsed.key.length > 1 && !range && parsed.shift !== event.shiftKey) return false
  if (range) return event.key >= range[1]! && event.key <= range[2]! && event.key.length === 1
  return parsed.key.length === 1
    ? event.key.toLowerCase() === parsed.key.toLowerCase()
    : event.key === parsed.key
}

const EDITABLE_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/** True when typing into `target` would produce text, so a bare key is not a command. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  // jsdom does not implement `isContentEditable`; the attribute is the same fact.
  const attribute = target.closest('[contenteditable]')?.getAttribute('contenteditable')
  if (attribute === '' || attribute === 'true' || attribute === 'plaintext-only') return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return !EDITABLE_INPUT_TYPES.has(target.type)
  return false
}

const SCOPE_ORDER: Record<ShortcutScope, number> = { global: 0, page: 1 }

export function createShortcutRegistry(): ShortcutRegistry {
  const registrations: Shortcut[] = []
  const listeners = new Set<() => void>()
  let snapshot: readonly ShortcutEntry[] = []

  const publish = () => {
    snapshot = registrations
      .map(({ key, description, scope }): ShortcutEntry => ({ key, description, scope }))
      .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope])
    listeners.forEach((listener) => listener())
  }

  return {
    register(shortcut) {
      parseKey(shortcut.key)
      registrations.push(shortcut)
      publish()
      return () => {
        const index = registrations.indexOf(shortcut)
        if (index === -1) return
        registrations.splice(index, 1)
        publish()
      }
    },
    list: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    handle(event) {
      if (event.defaultPrevented) return false
      const editable = isEditableTarget(event.target)
      // Newest registration first, so a page can shadow a global key.
      for (let index = registrations.length - 1; index >= 0; index -= 1) {
        const shortcut = registrations[index]!
        if (editable && !shortcut.allowInEditable) continue
        if (!matchesKey(shortcut.key, event)) continue
        event.preventDefault()
        shortcut.run(event)
        return true
      }
      return false
    },
  }
}

/** The registry a page reaches when no `ShortcutProvider` says otherwise. */
export const defaultShortcutRegistry: ShortcutRegistry = createShortcutRegistry()

const APPLE = /Mac|iPhone|iPad|iPod/

/** The key as the reader's keyboard labels it: ⌘ on Apple platforms, Ctrl elsewhere. */
export function formatKey(spec: string, platform?: string): string[] {
  const apple = APPLE.test(
    platform ?? (typeof navigator === 'undefined' ? '' : navigator.platform ?? ''),
  )
  const { mod, alt, shift, key } = parseKey(spec)
  const symbols: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Backspace: '⌫',
    Enter: 'Enter',
    Escape: 'Esc',
  }
  const caps: string[] = []
  if (mod) caps.push(apple ? '⌘' : 'Ctrl')
  if (alt) caps.push(apple ? '⌥' : 'Alt')
  if (shift) caps.push(apple ? '⇧' : 'Shift')
  caps.push(symbols[key] ?? key.replace('-', '–'))
  return caps
}
