import { HarvardOutlineViewer } from './HarvardOutline'
import { parseNotationDocument } from '../lib/notation'

export interface NotationViewerProps {
  source: string
  /** Return the current portal's mount-aware URL for a document fragment. */
  hrefForId: (id: string) => string
}

/**
 * A notation as the page itself: its title as the page's `<h1>`, its open
 * terms listed, then the outline. `Notation` renders the same source as one
 * collapsible document under a heading the page already has.
 */
export function NotationViewer({ source, hrefForId }: NotationViewerProps) {
  const document = parseNotationDocument(source)

  return (
    <article className="notation-viewer">
      {document.title ? <h1 className="notation-viewer__title">{document.title}</h1> : null}
      {document.openTerms.length ? (
        <aside className="notation-viewer__terms" aria-label="Open terms">
          <h2>Open terms</h2>
          <ul>
            {document.openTerms.map((term) => (
              <li key={term.id} id={term.id}>
                <span>{term.label}</span> <span>to be agreed</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <HarvardOutlineViewer
        sections={document.sections}
        introBlocks={document.preamble}
        aria-label="Contents"
        hrefForId={hrefForId}
        scrollMode="page"
      />
    </article>
  )
}
