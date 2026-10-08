/*
 * Where a reader is in a Harvard outline, measured from the page itself.
 *
 * The reader's place is the last unit whose top has reached the top of the
 * view. "Reached" allows the unit's own `scroll-margin-top` plus a few pixels,
 * so a unit the browser scrolled to — which lands at its scroll margin, not at
 * zero — counts as reached, and a page with a sticky header that raises the
 * margin keeps working. With the library's 8px margin that is 12px.
 *
 * One rule serves both the rail's highlight and the arrow keys, so the unit
 * the rail marks is always the unit an arrow steps from.
 */

/** Pixels beyond a unit's scroll margin that still count as having reached the top. */
const SLOP = 4

export interface ReaderPlace {
  /** Every unit of the outline, in document order. */
  units: HTMLElement[]
  /** Each unit's top, measured from the top of the view. */
  tops: number[]
  /** Index of the last unit that has reached the top, or -1 before the first. */
  current: number
  /** The units' `scroll-margin-top`: where a unit scrolled to its start comes to rest. */
  margin: number
}

/**
 * The reader's place in one outline. `viewTop` is the top of whatever scrolls
 * the document: 0 for the page, a pane's own top when the pane scrolls.
 */
export function readerPlace(outline: Element, viewTop = 0): ReaderPlace {
  const units = Array.from(outline.querySelectorAll<HTMLElement>('[data-harvard-id]'))
  const margin = units[0] ? parseFloat(getComputedStyle(units[0]).scrollMarginTop) || 0 : 0
  const tops = units.map((unit) => unit.getBoundingClientRect().top - viewTop)
  const current = tops.reduce((last, top, index) => (top <= margin + SLOP ? index : last), -1)
  return { units, tops, current, margin }
}

/** True when the element has a box on screen: rendered, and overlapping the viewport. */
function inView(element: Element): boolean {
  const box = element.getBoundingClientRect()
  if (box.width === 0 && box.height === 0) return false
  return box.top < window.innerHeight && box.bottom > 0
}

/**
 * The first page-scrolled outline that is open and on screen, or `null`. An
 * outline inside a closed `<details>` has no box, so it never qualifies.
 */
export function outlineInView(root: ParentNode = document): HTMLElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLElement>('.harvard-outline--page-scroll')).find(
      (outline) => !outline.closest('details:not([open])') && inView(outline),
    ) ?? null
  )
}

/**
 * The unit one step from the reader's place in `outline`, or `null` when the
 * step would leave it. Stepping back from part-way through a unit returns to
 * that unit's start rather than skipping to the one before.
 */
export function outlineStep(outline: Element, direction: 1 | -1): HTMLElement | null {
  const { units, tops, current, margin } = readerPlace(outline)
  if (direction === 1) return units[current + 1] ?? null
  if (current === -1) return null
  const partWay = (tops[current] ?? 0) < margin - SLOP
  return partWay ? (units[current] ?? null) : (units[current - 1] ?? null)
}
