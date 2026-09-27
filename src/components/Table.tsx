import type { ReactNode, TableHTMLAttributes } from 'react'

/*
 * Table — shadcn's presentational table, as composable parts.
 *
 * `DataTable` in this library is the opinionated one: it takes columns and rows
 * and owns the markup. This is the other half, and both are worth having. A
 * table with a merged header cell, a footer that sums a column, or a row that
 * spans is not expressible as a column array, and forcing it through one turns
 * the column definition into a template language.
 *
 * Reach for `DataTable` when the data is rectangular, and these when it is not.
 */

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Describes the table for a screen reader. Rendered visibly as a caption. */
  caption?: ReactNode
  /** Fill the band the table sits in, instead of a nested measure. */
  span?: 'full'
  children: ReactNode
}

/**
 * The scroll container and the table.
 *
 * The wrapper scrolls rather than the page, which is what keeps a wide table
 * from making the whole document scroll sideways on a phone. It is also why the
 * radius lives on the wrapper: the table itself cannot clip its own corners.
 */
export function Table({ caption, span, children, ...rest }: TableProps) {
  const wrapClass = span === 'full' ? 'nav-table-wrap nav-table-wrap--full' : 'nav-table-wrap'
  return (
    <div className={wrapClass}>
      <table className="nav-table" {...rest}>
        {caption ? <caption className="nav-table__caption">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="nav-table__header">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="nav-table__body">{children}</tbody>
}

/**
 * The summary row.
 *
 * A real `<tfoot>`, so a long table printed across pages repeats it and a
 * screen reader announces it as a footer rather than as one more data row.
 */
export function TableFooter({ children }: { children: ReactNode }) {
  return <tfoot className="nav-table__footer">{children}</tfoot>
}

export interface TableRowProps {
  children: ReactNode
  /** Marks the row as the current selection. */
  selected?: boolean
}

export function TableRow({ children, selected }: TableRowProps) {
  return (
    <tr className="nav-table__row" data-selected={selected ? 'true' : undefined}>
      {children}
    </tr>
  )
}

export interface TableCellProps {
  children?: ReactNode
  colSpan?: number
  /** Right-align, for a column of figures. Also switches on tabular figures. */
  numeric?: boolean
}

/**
 * A header cell.
 *
 * `scope` is not optional here and defaults to `col`, because a header cell
 * without one leaves a screen reader guessing which cells it governs — and the
 * guess is wrong exactly when the table is complicated enough to need the help.
 */
export function TableHead({
  children,
  colSpan,
  numeric,
  scope = 'col',
}: TableCellProps & { scope?: 'col' | 'row' | 'colgroup' | 'rowgroup' }) {
  return (
    <th
      className={numeric ? 'nav-table__th nav-table__cell--numeric' : 'nav-table__th'}
      scope={scope}
      colSpan={colSpan}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, colSpan, numeric }: TableCellProps) {
  return (
    <td
      className={numeric ? 'nav-table__td nav-table__cell--numeric' : 'nav-table__td'}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}
