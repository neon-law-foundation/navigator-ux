import { useMemo, useRef, type ReactNode, type RefObject } from 'react'

import { parseNotationDocument } from '../lib/notation'
import { outlineInView, outlineStep } from '../lib/reader-place'
import type { Shortcut } from '../lib/shortcuts'
import { Accordion } from './Disclosure'
import {
  HarvardOutlineViewer,
  type HarvardOutlineBlock,
  type HarvardOutlineSection,
} from './HarvardOutline'
import { useShortcut } from './Shortcuts'

interface NotationCommonProps {
  /** The `<details>` id, and so the anchor for the whole document. */
  id: string
  /** Names the outline rail. */
  'aria-label'?: string
  /** Return the current page's mount-aware URL for a document fragment. */
  hrefForId: (id: string) => string
  /** Open on first render. Closed by default. */
  defaultOpen?: boolean
  /** Rendered inside the item after the outline, such as a signature block. */
  after?: ReactNode
}

/** A notation's Markdown source, parsed with `parseNotationDocument`. */
export interface NotationSourceProps extends NotationCommonProps {
  source: string
  /** The summary line. Defaults to the source's `#` title. */
  trigger?: ReactNode
  sections?: never
  introBlocks?: never
}

/** A document already in outline form, such as one transcribed by hand rather than written as a notation. */
export interface NotationSectionsProps extends NotationCommonProps {
  source?: never
  /** The summary line that names the document. */
  trigger: ReactNode
  sections: HarvardOutlineSection[]
  /** Material before the first unit, as a source's preamble would be. */
  introBlocks?: HarvardOutlineBlock[]
}

export type NotationProps = NotationSourceProps | NotationSectionsProps

/**
 * A notation on a page, as one collapsible document.
 *
 * A notation is a Markdown document: optional `---` frontmatter, a `#` title,
 * a preamble, then outline headings — `## I. Services`, `### A. …`, `## 1.`
 * for an uncaptioned clause — each followed by its copy. Render one from a
 * file with `import source from './agreement.md?raw'` and
 * `<Notation id="agreement" source={source} hrefForId={…} />`.
 *
 * It renders a single accordion item whose summary is the title, and inside
 * it the document as a page-scrolled Harvard outline with its rail. The item's
 * `id` anchors the whole document; each unit is anchored by its path
 * (`section-ii`, `section-ii-a`, `section-1-a`) and each block by its unit and
 * position (`section-ii-1`). A link to any of them opens the item.
 *
 * `NotationViewer` renders the same source as the page itself, with its title
 * as the page's `<h1>` and a list of open terms. `Notation` renders no heading
 * of its own, so it can sit beside other documents under the page's heading.
 *
 * While an open outline is on screen, ↑ and ↓ step to the previous or next
 * unit from anywhere on the page and record it in the address without adding
 * a history entry. The keys are registered with the shortcut registry, so
 * they need a `ShortcutHost` (`NavigatorShell` mounts one) and appear in its
 * `?` overlay.
 */
export function Notation({
  id,
  trigger,
  'aria-label': ariaLabel = 'Contents',
  hrefForId,
  defaultOpen = false,
  after,
  source,
  sections,
  introBlocks,
}: NotationProps) {
  const parsed = useMemo(
    () => (source === undefined ? undefined : parseNotationDocument(source)),
    [source],
  )
  const ref = useRef<HTMLDivElement>(null)
  useOutlineArrows(ref, hrefForId)

  return (
    <Accordion
      items={[
        {
          id,
          trigger: trigger ?? parsed?.title,
          defaultOpen,
          children: (
            <div ref={ref}>
              <HarvardOutlineViewer
                aria-label={ariaLabel}
                sections={parsed?.sections ?? sections ?? []}
                introBlocks={parsed?.preamble ?? introBlocks}
                hrefForId={hrefForId}
                scrollMode="page"
              />
              {after}
            </div>
          ),
        },
      ]}
    />
  )
}

/** Controls that already answer to the arrow keys themselves. */
const OWNS_ARROWS =
  'input, select, textarea, [role="slider"], [role="spinbutton"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="radiogroup"], [role="tree"], [role="grid"]'

function ownsArrows(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OWNS_ARROWS) !== null
}

/**
 * ↑ and ↓ for the outline inside `container`. Every instance registers the
 * same two keys, and each claims them only while the outline on screen is its
 * own; otherwise the key falls through and the page scrolls as usual.
 */
function useOutlineArrows(
  container: RefObject<HTMLElement | null>,
  hrefForId: (id: string) => string,
) {
  const unitFrom = (direction: 1 | -1) => {
    const outline = outlineInView()
    if (!outline || !container.current?.contains(outline)) return null
    return outlineStep(outline, direction)
  }
  const arrow = (direction: 1 | -1): Shortcut => ({
    key: direction === 1 ? 'ArrowDown' : 'ArrowUp',
    description: direction === 1 ? 'Next outline unit' : 'Previous outline unit',
    scope: 'page',
    when: (event) => !ownsArrows(event.target) && unitFrom(direction) !== null,
    run: () => {
      const unit = unitFrom(direction)
      if (!unit) return
      unit.scrollIntoView({ block: 'start', behavior: 'instant' })
      window.history.replaceState(window.history.state, '', hrefForId(unit.id))
    },
  })
  useShortcut(arrow(1))
  useShortcut(arrow(-1))
}
