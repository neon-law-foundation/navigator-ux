import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export interface HarvardOutlineSection {
  /** Stable id used as the document fragment and the nav target. */
  id: string
  /** Displayed marker: "I", "A", "1", "a". */
  marker: string
  title: string
  /** Body of this unit. Nested sections render after it. */
  children?: ReactNode
  /** Parsed notation blocks rendered when `children` is not supplied. */
  blocks?: HarvardOutlineBlock[]
  sections?: HarvardOutlineSection[]
}

export interface HarvardOutlineBlock {
  id: string
  type: 'paragraph' | 'list-item' | 'ordered-list-item' | 'hold' | 'quotation'
  text: string
  runs: HarvardOutlineRun[]
}

export interface HarvardOutlineRun {
  id: string
  type: 'text' | 'emphasis' | 'open-term'
  text: string
}

export interface HarvardOutlineViewerProps {
  sections: HarvardOutlineSection[]
  /** Names the outline landmark. */
  'aria-label'?: string
  /**
   * When set, the highlighted unit is controlled by the caller. Pair with
   * `onActiveIdChange` so scroll and keyboard still report.
   */
  activeId?: string
  onActiveIdChange?: (id: string) => void
  /** Scroll the document with the page and keep the outline rail sticky. */
  scrollMode?: 'pane' | 'page'
  /** Render document material before the first outline section. */
  introBlocks?: HarvardOutlineBlock[]
  /** Build a mount-aware fragment URL for each outline section. */
  hrefForId?: (id: string) => string
}

interface FlatUnit {
  id: string
  marker: string
  title: string
  path: string
  depth: number
  children?: ReactNode
  blocks?: HarvardOutlineBlock[]
}

function flatten(
  sections: HarvardOutlineSection[],
  depth = 1,
  parentPath = '',
): FlatUnit[] {
  return sections.flatMap((section) => {
    const path = parentPath ? `${parentPath}.${section.marker}` : section.marker
    return [
      {
        id: section.id,
        marker: section.marker,
        title: section.title,
        path,
        depth,
        children: section.children,
        blocks: section.blocks,
      },
      ...flatten(section.sections ?? [], depth + 1, path),
    ]
  })
}

function BlockList({ blocks }: { blocks: HarvardOutlineBlock[] }) {
  const renderRuns = (block: HarvardOutlineBlock) => block.runs.map((run) => (
    run.type === 'emphasis'
      ? <em key={run.id}>{run.text}</em>
      : run.type === 'open-term'
        ? <mark className="notation-viewer__open-term" key={run.id}>{run.text}: to be agreed</mark>
        : <span key={run.id}>{run.text}</span>
  ))

  const rendered: ReactNode[] = []
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index]!
    if (block.type === 'list-item' || block.type === 'ordered-list-item') {
      const type = block.type
      const items: HarvardOutlineBlock[] = []
      while (blocks[index]?.type === type) items.push(blocks[index++]!)
      const List = type === 'ordered-list-item' ? 'ol' : 'ul'
      rendered.push(
        <List className="harvard-outline__list" key={block.id}>
          {items.map((item) => (
            <li id={item.id} data-notation-type={item.type} key={item.id}>{renderRuns(item)}</li>
          ))}
        </List>,
      )
      continue
    }
    index += 1
    if (block.type === 'quotation') {
      rendered.push(
        <blockquote className="harvard-outline__quote" id={block.id} data-notation-type={block.type} key={block.id}>
          {renderRuns(block)}
        </blockquote>,
      )
      continue
    }
    rendered.push(
      <p
        key={block.id}
        id={block.id}
        className={block.type === 'hold' ? 'harvard-outline__hold' : undefined}
        data-notation-type={block.type}
      >
        {block.type === 'hold' ? <>[ {renderRuns(block)} ]</> : renderRuns(block)}
      </p>,
    )
  }
  return <>{rendered}</>
}

/**
 * A Harvard-outline document with a live navigator.
 *
 * The rail is the outline a lawyer already knows — Roman, then letter, then
 * Arabic — and it tracks the unit currently in view as the reader moves down
 * the document. Clicking a marker jumps there; j/k and the arrow keys step
 * when the navigator has focus. The document is handed in; this component
 * holds none of its own.
 */
export function HarvardOutlineViewer({
  sections,
  'aria-label': ariaLabel = 'Harvard outline',
  activeId,
  onActiveIdChange,
  scrollMode = 'pane',
  introBlocks,
  hrefForId,
}: HarvardOutlineViewerProps) {
  const units = useMemo(() => flatten(sections), [sections])
  const navId = useId()
  const navRef = useRef<HTMLElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [internalId, setInternalId] = useState(units[0]?.id ?? '')
  const currentId = activeId ?? internalId
  const setCurrentRef = useRef<(id: string) => void>(() => undefined)

  const setCurrent = useCallback(
    (id: string) => {
      onActiveIdChange?.(id)
      if (activeId === undefined) setInternalId(id)
    },
    [activeId, onActiveIdChange],
  )

  useEffect(() => {
    setCurrentRef.current = setCurrent
  }, [setCurrent])

  useEffect(() => {
    if (activeId !== undefined) return
    if (units.some((unit) => unit.id === internalId)) return
    setInternalId(units[0]?.id ?? '')
  }, [activeId, internalId, units])

  useEffect(() => {
    if (units.length === 0 || typeof IntersectionObserver === 'undefined') return undefined
    const root = scrollMode === 'page' ? null : paneRef.current
    const documentRoot = scrollMode === 'page' ? document.getElementById(navId) : root
    if (!documentRoot) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const next = visible[0]?.target.getAttribute('data-harvard-id')
        if (next) setCurrentRef.current(next)
      },
      { root, rootMargin: '0px 0px -55% 0px', threshold: 0 },
    )

    for (const node of documentRoot.querySelectorAll('[data-harvard-id]')) {
      observer.observe(node)
    }
    return () => observer.disconnect()
  }, [navId, scrollMode, units])

  useEffect(() => {
    const nav = navRef.current
    if (!nav || !currentId) return
    const item = Array.from(nav.querySelectorAll<HTMLElement>('[data-harvard-nav-id]')).find(
      (node) => node.dataset.harvardNavId === currentId,
    )
    if (!item) return
    const navRect = nav.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    if (itemRect.top < navRect.top) nav.scrollTop -= navRect.top - itemRect.top
    else if (itemRect.bottom > navRect.bottom) nav.scrollTop += itemRect.bottom - navRect.bottom
  }, [currentId])

  const jumpTo = useCallback(
    (id: string) => {
      setCurrent(id)
      const pane = paneRef.current
      const target = pane
        ? Array.from(pane.querySelectorAll('[data-harvard-id]')).find(
            (node) => node.getAttribute('data-harvard-id') === id,
          )
        : undefined
      if (!(target instanceof HTMLElement)) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    },
    [setCurrent],
  )

  const step = useCallback(
    (delta: number) => {
      const index = units.findIndex((unit) => unit.id === currentId)
      const next = units[index + delta] ?? units[delta > 0 ? units.length - 1 : 0]
      if (next) jumpTo(next.id)
    },
    [currentId, jumpTo, units],
  )

  const onNavKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'j' || event.key === ' ') {
        event.preventDefault()
        step(1)
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault()
        step(-1)
      }
    },
    [step],
  )

  if (units.length === 0) {
    return (
      <div className="harvard-outline">
        <p className="harvard-outline__empty">This outline has no sections yet.</p>
      </div>
    )
  }

  return (
    <div className={`harvard-outline${scrollMode === 'page' ? ' harvard-outline--page-scroll' : ''}`}>
      <nav
        ref={navRef}
        className="harvard-outline__nav"
        aria-label={ariaLabel}
        aria-controls={navId}
        tabIndex={0}
        onKeyDown={onNavKeyDown}
      >
        {units.map((unit) => {
          const current = unit.id === currentId
          return hrefForId ? (
            <a
              key={unit.id}
              className={
                current
                  ? 'harvard-outline__item harvard-outline__item--current'
                  : 'harvard-outline__item'
              }
              data-depth={Math.min(unit.depth, 6)}
              data-harvard-nav-id={unit.id}
              aria-current={current ? 'location' : undefined}
              href={hrefForId(unit.id)}
            >
              <span className="harvard-outline__marker">{unit.marker}.</span>
              <span className="harvard-outline__label">{unit.title}</span>
              <span className="harvard-outline__path">{unit.path}</span>
            </a>
          ) : (
            <button
              key={unit.id}
              type="button"
              className={
                current
                  ? 'harvard-outline__item harvard-outline__item--current'
                  : 'harvard-outline__item'
              }
              data-depth={Math.min(unit.depth, 6)}
              data-harvard-nav-id={unit.id}
              aria-current={current ? 'location' : undefined}
              onClick={() => jumpTo(unit.id)}
            >
              <span className="harvard-outline__marker">{unit.marker}.</span>
              <span className="harvard-outline__label">{unit.title}</span>
              <span className="harvard-outline__path">{unit.path}</span>
            </button>
          )
        })}
      </nav>
      <div
        className="harvard-outline__doc"
        id={navId}
        ref={paneRef}
        tabIndex={-1}
        data-harvard-document
      >
        {introBlocks?.length ? (
          <div className="harvard-outline__intro"><BlockList blocks={introBlocks} /></div>
        ) : null}
        {units.map((unit) => {
          const current = unit.id === currentId
          return (
            <article
              key={unit.id}
              className={
                current
                  ? 'harvard-outline__unit harvard-outline__unit--current'
                  : 'harvard-outline__unit'
              }
              data-harvard-id={unit.id}
              data-harvard-path={unit.path}
              aria-current={current ? 'location' : undefined}
              id={unit.id}
            >
              <h3 className="harvard-outline__heading">
                <span className="harvard-outline__marker">{unit.marker}.</span> {unit.title}
              </h3>
              {unit.children ?? (unit.blocks ? <BlockList blocks={unit.blocks} /> : null)}
            </article>
          )
        })}
      </div>
    </div>
  )
}
