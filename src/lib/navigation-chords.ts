/*
 * The global navigation chords — `g` then a letter — defined once.
 *
 * The map lives here, not in each portal, so every portal answers to the same
 * keys. A portal supplies only where each page lives; a page it does not have
 * is simply absent from the hrefs it passes, and its chord is neither
 * registered nor listed in the `?` overlay.
 */

export type NavigationPage = 'matters' | 'notations' | 'documents'

export interface NavigationChord {
  page: NavigationPage
  /** The chord, in the registry's notation. */
  key: string
  description: string
}

export const NAVIGATION_CHORDS: readonly NavigationChord[] = [
  { page: 'matters', key: 'g m', description: 'Go to matters' },
  { page: 'notations', key: 'g n', description: 'Go to notations' },
  { page: 'documents', key: 'g d', description: 'Go to documents' },
]

/** Where each page lives in this portal. Leave a page out to leave its chord out. */
export type NavigationHrefs = Partial<Record<NavigationPage, string>>

/** The chords a portal has pages for, in map order. */
export function chordsFor(hrefs: NavigationHrefs): Array<NavigationChord & { href: string }> {
  return NAVIGATION_CHORDS.flatMap((chord) => {
    const href = hrefs[chord.page]
    return href ? [{ ...chord, href }] : []
  })
}
