import type { ReactNode } from 'react'
import { Icon } from './Icon'

/*
 * The data table, its pagination strip, and the per-row action cluster.
 *
 * The whole surface is a URL contract. Sort state lives in `?sort=` and paging
 * in `?page=`, and both are real anchors, so the table sorts and pages with no
 * client bundle at all — the server renders the next state and the browser
 * fetches it. That is also why the component takes href *builders* rather than
 * click handlers: it has no router and no query-string opinion, and the caller
 * owns both.
 */

export type SortDirection = 'asc' | 'desc'

export interface DataColumn<Row> {
  /** Stable identifier, and the value that goes in `?sort=`. */
  key: string
  header: ReactNode
  /** Render one cell. Returning a string is fine and common. */
  cell: (row: Row) => ReactNode
  /** Only sortable columns get a header link. */
  sortable?: boolean
}

export interface DataTableProps<Row> {
  columns: DataColumn<Row>[]
  rows: Row[]
  /** Stable per-row key. An index would reorder wrongly on sort. */
  rowKey: (row: Row) => string
  /**
   * A caption naming the table. Visually present — a table that needs a caption
   * for a screen reader usually needs one for everyone.
   */
  caption?: ReactNode
  /** The column the server sorted by, and which way. */
  sort?: { key: string; direction: SortDirection }
  /**
   * Build the URL that sorts by `key` in `direction`. Required only when some
   * column is sortable.
   */
  sortHref?: (key: string, direction: SortDirection) => string
  /** Shown in place of the body when there is nothing to list. */
  empty?: ReactNode
  /** Fill the band the table sits in, instead of a nested measure. */
  span?: 'full'
}

function tableWrapClass(span?: 'full') {
  return span === 'full' ? 'nav-table-wrap nav-table-wrap--full' : 'nav-table-wrap'
}

const ARROW: Record<SortDirection, string> = { asc: '↑', desc: '↓' }

/** `aria-sort` takes the participle, not the abbreviation. */
const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  sort,
  sortHref,
  empty = 'Nothing to show.',
  span,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className={tableWrapClass(span)}>
        {caption ? <p className="nav-text-muted">{caption}</p> : null}
        <p className="nav-empty">{empty}</p>
      </div>
    )
  }

  return (
    <div className={tableWrapClass(span)}>
      <table className="nav-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key
              // Clicking the active column reverses it; clicking any other
              // starts it ascending, which is what a reader expects.
              const next: SortDirection = active && sort.direction === 'asc' ? 'desc' : 'asc'

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? ARIA_SORT[sort.direction] : undefined}
                >
                  {column.sortable && sortHref ? (
                    <a href={sortHref(column.key, next)}>
                      {column.header}
                      {active ? (
                        <span className="nav-sort-arrow" aria-hidden="true">
                          {' '}
                          {ARROW[sort.direction]}
                        </span>
                      ) : null}
                    </a>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------ Pagination -- */

export interface PaginationProps {
  page: number
  totalPages: number
  /** Build the URL for a page number. */
  pageHref: (page: number) => string
  'aria-label'?: string
  previousLabel?: string
  nextLabel?: string
}

/**
 * Previous / next, as anchors.
 *
 * An unavailable step renders as a non-anchor `<span>` rather than a disabled
 * link, because a disabled link is not a thing: `aria-disabled` on an `<a
 * href>` still lets a keyboard user follow it. No href, nothing to follow.
 */
export function Pagination({
  page,
  totalPages,
  pageHref,
  'aria-label': ariaLabel = 'Pagination',
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const steps = [
    { label: previousLabel, target: page - 1, available: page > 1 },
    { label: nextLabel, target: page + 1, available: page < totalPages },
  ]

  return (
    <nav className="nav-pagination" aria-label={ariaLabel}>
      <ul className="nav-pagination__list">
        {steps.map((step) => (
          <li
            key={step.label}
            className={
              step.available ? 'nav-pagination__item' : 'nav-pagination__item nav-pagination__item--disabled'
            }
          >
            {step.available ? (
              <a className="nav-pagination__link" href={pageHref(step.target)}>
                {step.label}
              </a>
            ) : (
              <span className="nav-pagination__link">{step.label}</span>
            )}
          </li>
        ))}
        <li className="nav-pagination__status" aria-current="page">
          Page {page} of {totalPages}
        </li>
      </ul>
    </nav>
  )
}

/* ------------------------------------------------------------ RowActions -- */

export interface RowActionLink {
  kind: 'link'
  label: string
  href: string
  icon?: 'pencil-square' | 'eye' | 'diagram-3-fill'
}

export interface RowActionPost {
  kind: 'post'
  label: string
  /** Where the form posts. */
  action: string
  icon?: 'trash3-fill' | 'x-lg' | 'check-lg'
  /** Wears the danger button. */
  destructive?: boolean
  hiddenFields?: Record<string, string>
}

export type RowAction = RowActionLink | RowActionPost

export interface RowActionsProps {
  actions: RowAction[]
  /**
   * Names the cluster for assistive technology — "Actions for <the row's subject>".
   * A table of identical "Edit / Delete" pairs is unnavigable without it.
   */
  label: string
}

/**
 * The per-row cluster of controls.
 *
 * Reading actions are links; destructive actions are `POST` forms. That split
 * is not stylistic. A link is a `GET`, and a `GET` is fair game for a
 * prefetcher, a crawler, or a browser restoring tabs — any of which would
 * silently delete the row. The form also means the destructive path still works
 * with no JavaScript.
 *
 * Every control carries an `aria-label`, because an icon-only button announces
 * as "button" and nothing else.
 */
export function RowActions({ actions, label }: RowActionsProps) {
  return (
    <div className="row-actions" role="group" aria-label={label}>
      {actions.map((action) =>
        action.kind === 'link' ? (
          <a
            key={action.label}
            className="row-action nav-btn nav-btn--secondary"
            href={action.href}
            aria-label={`${action.label} — ${label}`}
          >
            {action.icon ? <Icon name={action.icon} /> : null}
            {action.label}
          </a>
        ) : (
          <form key={action.label} method="post" action={action.action}>
            {Object.entries(action.hiddenFields ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              className={`nav-btn ${action.destructive ? 'nav-btn--danger' : 'nav-btn--secondary'}`}
              aria-label={`${action.label} — ${label}`}
            >
              {action.icon ? <Icon name={action.icon} /> : null}
              {action.label}
            </button>
          </form>
        ),
      )}
    </div>
  )
}
