/*
 * The keyboard-shortcut registry — the one list every shortcut is declared in.
 *
 * A page registers what it answers to as a key, a description, and a scope, and
 * the `?` help overlay renders straight from this list. Because the overlay
 * reads the registry rather than a second hand-kept table, a shortcut that works
 * is a shortcut that is listed, and a listed one works.
 *
 * Keys are written the way a person reads them: `?`, `1`, `Mod+Enter`,
 * `Alt+ArrowLeft`. A chord is keys separated by spaces — `g m` is G, then M —
 * and must be finished within a second of its last key. A digit range such as `1-9` is one registration for the
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

export interface ShortcutRegistryOptions {
  /** How long a half-typed chord waits for its next key, in milliseconds. */
  chordTimeoutMs?: number
}

export interface ShortcutRegistry {
  /** Add a shortcut; the returned function removes exactly that registration. */
  register: (shortcut: Shortcut) => () => void
  /** Every registered shortcut, global before page, in registration order. */
  list: () => readonly ShortcutEntry[]
  /** Called after every change to the list. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void
  /** Offer a keydown to the registry; true when a shortcut (or a chord's first keys) took it. */
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

/** The keys of a chord, in order; a single key is a chord of one. */
export function chordSteps(spec: string): string[] {
  return spec.split(' ').filter((step) => step !== '')
}

/** True when the keydown is the key `spec` names (one step of a chord). */
export function matchesKey(spec: string, event: KeyboardEvent): boolean {
  const parsed = parseKey(spec)
  const mod = event.metaKey || event.ctrlKey
  if (parsed.mod !== mod || parsed.alt !== event.altKey) return false
  // A printable character already encodes Shift (`?` is Shift+/), so only a
  // named key such as Enter has a Shift state worth comparing.
  const range = /^(\d)-(\d)$/.exec(parsed.key)
  if (parsed.key.length > 1 && !range && parsed.shift !== event.shiftKey) return false
  if (range) return event.key >= range[1]! && event.key <= range[2]! && event.key.length === 1
  if (parsed.key.length === 1) {
    // Shift+G is not `g`: only a letter written in capitals asks for Shift.
    const letter = parsed.key.toLowerCase() !== parsed.key.toUpperCase()
    if (letter && parsed.key === parsed.key.toLowerCase() && event.shiftKey) return false
    return event.key.toLowerCase() === parsed.key.toLowerCase()
  }
  return event.key === parsed.key
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

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock'])

export function createShortcutRegistry({
  chordTimeoutMs = 1000,
}: ShortcutRegistryOptions = {}): ShortcutRegistry {
  const registrations: Shortcut[] = []
  const listeners = new Set<() => void>()
  let snapshot: readonly ShortcutEntry[] = []
  /** Shortcuts still alive in a half-typed chord, and how many keys have matched. */
  let pending: { candidates: Shortcut[]; matched: number } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const reset = () => {
    pending = null
    clearTimeout(timer)
    timer = undefined
  }

  const publish = () => {
    snapshot = registrations
      .map(({ key, description, scope }): ShortcutEntry => ({ key, description, scope }))
      .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope])
    listeners.forEach((listener) => listener())
  }

  /** Newest-first shortcuts whose `matched`th key this event is. */
  const advance = (pool: Shortcut[], matched: number, event: KeyboardEvent, editable: boolean) =>
    pool.filter((shortcut) => {
      if (editable && !shortcut.allowInEditable) return false
      const step = chordSteps(shortcut.key)[matched]
      return step !== undefined && matchesKey(step, event)
    })

  return {
    register(shortcut) {
      chordSteps(shortcut.key).forEach(parseKey)
      registrations.push(shortcut)
      publish()
      return () => {
        const index = registrations.indexOf(shortcut)
        if (index === -1) return
        registrations.splice(index, 1)
        reset()
        publish()
      }
    },
    list: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    handle(event) {
      if (event.defaultPrevented || MODIFIER_KEYS.has(event.key)) return false
      const editable = isEditableTarget(event.target)
      const newestFirst = [...registrations].reverse()

      // Continue a chord if one is waiting; if this key does not continue it,
      // the chord is dropped and the key is read afresh.
      let matched = 0
      let hits: Shortcut[] = []
      if (pending) {
        hits = advance(pending.candidates, pending.matched, event, editable)
        matched = pending.matched
        reset()
      }
      if (hits.length === 0) {
        matched = 0
        hits = advance(newestFirst, 0, event, editable)
      }
      if (hits.length === 0) return false

      const done = hits.find((shortcut) => chordSteps(shortcut.key).length === matched + 1)
      event.preventDefault()
      if (done) {
        done.run(event)
        return true
      }
      pending = { candidates: hits, matched: matched + 1 }
      timer = setTimeout(reset, chordTimeoutMs)
      return true
    },
  }
}

/** The registry a page reaches when no `ShortcutProvider` says otherwise. */
export const defaultShortcutRegistry: ShortcutRegistry = createShortcutRegistry()

const APPLE = /Mac|iPhone|iPad|iPod/

/** Joins the keys of a chord in `formatKey`'s result. */
export const CHORD_THEN = 'then'

/** The key as the reader's keyboard labels it: ⌘ on Apple platforms, Ctrl elsewhere. */
export function formatKey(spec: string, platform?: string): string[] {
  return chordSteps(spec).flatMap((step, index) => [
    ...(index > 0 ? [CHORD_THEN] : []),
    ...formatStep(step, platform),
  ])
}

function formatStep(spec: string, platform?: string): string[] {
  const apple = APPLE.test(
    platform ?? (typeof navigator === 'undefined' ? '' : (navigator.platform ?? '')),
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
