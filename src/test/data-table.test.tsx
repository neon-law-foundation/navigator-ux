import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakePerson } from '../../fixtures/fake.mjs'
import { DataTable, Pagination, RowActions, type DataColumn } from '../components/DataTable'
import { ConfirmDelete } from '../components/ConfirmDelete'

interface Person {
  id: string
  name: string
  email: string
}

const FIRST = fakePerson('data-table/first')
const SECOND = fakePerson('data-table/second')

const people: Person[] = [
  { id: '1', name: FIRST.name, email: FIRST.email },
  { id: '2', name: SECOND.name, email: SECOND.email },
]

const columns: DataColumn<Person>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name, sortable: true },
  { key: 'email', header: 'Email', cell: (row) => row.email, sortable: true },
  { key: 'actions', header: 'Actions', cell: () => '—' },
]

const sortHref = (key: string, direction: string) => `?sort=${key}&dir=${direction}`

describe('DataTable', () => {
  it('marks a full-width table on the wrap', () => {
    const { container } = render(
      <DataTable columns={columns} rows={people} rowKey={(row) => row.id} span="full" />,
    )
    expect(container.querySelector('.nav-table-wrap--full')).toBeInTheDocument()
  })

  it('renders a row per record and a cell per column', () => {
    render(<DataTable columns={columns} rows={people} rowKey={(row) => row.id} />)
    // Two records plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText(FIRST.email)).toBeInTheDocument()
  })

  it('puts sort state in the URL, as real anchors', () => {
    render(
      <DataTable columns={columns} rows={people} rowKey={(row) => row.id} sortHref={sortHref} />,
    )
    // A table that sorts without a client bundle sorts by navigating.
    expect(screen.getByRole('link', { name: 'Name' })).toHaveAttribute(
      'href',
      '?sort=name&dir=asc',
    )
  })

  it('reverses the active column and starts every other one ascending', () => {
    render(
      <DataTable
        columns={columns}
        rows={people}
        rowKey={(row) => row.id}
        sort={{ key: 'name', direction: 'asc' }}
        sortHref={sortHref}
      />,
    )

    expect(screen.getByRole('link', { name: /Name/ })).toHaveAttribute('href', '?sort=name&dir=desc')
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      '?sort=email&dir=asc',
    )
  })

  it('announces the sorted column through aria-sort', () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={people}
        rowKey={(row) => row.id}
        sort={{ key: 'name', direction: 'asc' }}
        sortHref={sortHref}
      />,
    )
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    rerender(
      <DataTable
        columns={columns}
        rows={people}
        rowKey={(row) => row.id}
        sort={{ key: 'name', direction: 'desc' }}
        sortHref={sortHref}
      />,
    )
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('leaves an unsorted column with no aria-sort at all', () => {
    render(
      <DataTable columns={columns} rows={people} rowKey={(row) => row.id} sortHref={sortHref} />,
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort')
  })

  it('renders a non-sortable header as plain text', () => {
    render(
      <DataTable columns={columns} rows={people} rowKey={(row) => row.id} sortHref={sortHref} />,
    )
    const header = screen.getByRole('columnheader', { name: 'Actions' })
    expect(within(header).queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders no header links when the caller supplied no builder', () => {
    render(<DataTable columns={columns} rows={people} rowKey={(row) => row.id} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the empty state instead of an empty table', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        caption="People"
        empty="No people yet."
      />,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('No people yet.')).toBeInTheDocument()
    expect(screen.getByText('People')).toBeInTheDocument()
  })

  it('has a default empty message and needs no caption', () => {
    const { container } = render(
      <DataTable columns={columns} rows={[]} rowKey={(row) => row.id} />,
    )
    expect(screen.getByText('Nothing to show.')).toBeInTheDocument()
    expect(container.querySelector('.nav-text-muted')).toBeNull()
  })

  it('renders a caption element when there are rows', () => {
    const { container } = render(
      <DataTable columns={columns} rows={people} rowKey={(row) => row.id} caption="People" />,
    )
    expect(container.querySelector('caption')).toHaveTextContent('People')
  })
})

describe('Pagination', () => {
  const pageHref = (page: number) => `?page=${page}`

  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} pageHref={pageHref} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('puts paging in the URL, as real anchors', () => {
    render(<Pagination page={2} totalPages={5} pageHref={pageHref} />)
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '?page=1')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?page=3')
  })

  it('renders an unavailable step as text, not a disabled link', () => {
    render(<Pagination page={1} totalPages={3} pageHref={pageHref} />)
    // A disabled <a href> is still followable by keyboard; no href, nothing to
    // follow.
    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next' })).toBeInTheDocument()
  })

  it('drops the next step on the last page', () => {
    render(<Pagination page={3} totalPages={3} pageHref={pageHref} />)
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous' })).toBeInTheDocument()
  })

  it('states the position and takes custom labels', () => {
    render(
      <Pagination
        page={2}
        totalPages={4}
        pageHref={pageHref}
        previousLabel="Back"
        nextLabel="Forward"
        aria-label="Results"
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Results' })).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
  })
})

describe('RowActions', () => {
  it('names every control for the row it belongs to', () => {
    render(
      <RowActions
        label={FIRST.name}
        actions={[
          { kind: 'link', label: 'Edit', href: '/people/1/edit', icon: 'pencil-square' },
          { kind: 'post', label: 'Delete', action: '/people/1/delete', destructive: true },
        ]}
      />,
    )
    // A table of identical Edit/Delete pairs is unnavigable without this.
    expect(screen.getByRole('link', { name: `Edit — ${FIRST.name}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Delete — ${FIRST.name}` })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: FIRST.name })).toBeInTheDocument()
  })

  it('makes a destructive action a POST form, never a link', () => {
    const { container } = render(
      <RowActions
        label="Row"
        actions={[
          {
            kind: 'post',
            label: 'Delete',
            action: '/x/delete',
            destructive: true,
            icon: 'trash3-fill',
            hiddenFields: { _csrf: 'tok' },
          },
        ]}
      />,
    )
    const form = container.querySelector('form')
    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/x/delete')
    expect(container.querySelector('input[name="_csrf"]')).toHaveValue('tok')
    expect(screen.getByRole('button', { name: /Delete/ })).toHaveClass('nav-btn--danger')
  })

  it('renders a non-destructive post and an icon-less link', () => {
    render(
      <RowActions
        label="Row"
        actions={[
          { kind: 'link', label: 'View', href: '/x' },
          { kind: 'post', label: 'Approve', action: '/x/approve' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: /Approve/ })).toHaveClass('nav-btn--secondary')
    expect(screen.getByRole('link', { name: /View/ })).toBeInTheDocument()
  })
})

describe('ConfirmDelete', () => {
  const props = {
    title: 'Delete this person?',
    message: 'This cannot be undone.',
    action: '/people/1/delete',
  }

  it('is an alertdialog described by its own prompt', () => {
    render(<ConfirmDelete {...props} open onCancel={vi.fn()} />)
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this person?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('opens as a modal so the rest of the document goes inert', () => {
    const { container } = render(<ConfirmDelete {...props} open onCancel={vi.fn()} />)
    const dialog = container.querySelector('dialog')
    // `showModal` is what puts it in the top layer; the `open` attribute alone
    // renders a non-modal dialog that traps nothing.
    expect(dialog?.open).toBe(true)
  })

  it('stays closed until asked', () => {
    const { container } = render(<ConfirmDelete {...props} open={false} onCancel={vi.fn()} />)
    expect(container.querySelector('dialog')?.open).toBe(false)
  })

  it('confirms through a POST form carrying its hidden fields', () => {
    const { container } = render(
      <ConfirmDelete {...props} open hiddenFields={{ _csrf: 'tok' }} onCancel={vi.fn()} />,
    )
    const form = container.querySelector('form')
    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/people/1/delete')
    expect(container.querySelector('input[name="_csrf"]')).toHaveValue('tok')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('type', 'submit')
  })

  it('routes the cancel button back to the caller', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmDelete {...props} open onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('takes custom labels', () => {
    render(
      <ConfirmDelete
        {...props}
        open
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument()
  })

  it('reopens after an Esc dismissal', () => {
    // Esc fires `cancel`, which we preventDefault so React stays the source of
    // truth for `open`. Without that the DOM closes behind React's back and the
    // dialog can never be reopened.
    const onCancel = vi.fn()
    const { container, rerender } = render(
      <ConfirmDelete {...props} open onCancel={onCancel} />,
    )
    const dialog = container.querySelector('dialog')

    rerender(<ConfirmDelete {...props} open={false} onCancel={onCancel} />)
    expect(dialog?.open).toBe(false)

    rerender(<ConfirmDelete {...props} open onCancel={onCancel} />)
    expect(dialog?.open).toBe(true)
  })

  it('routes an Esc dismissal back to the caller without closing behind React', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmDelete {...props} open onCancel={onCancel} />)
    const dialog = container.querySelector('dialog')

    // The browser fires `cancel` on Esc. We preventDefault so React stays the
    // source of truth for `open`, and report it upward instead.
    const event = new Event('cancel', { bubbles: false, cancelable: true })
    dialog?.dispatchEvent(event)

    expect(onCancel).toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
    expect(dialog?.open).toBe(true)
  })

  it('reports a close driven from the DOM', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmDelete {...props} open onCancel={onCancel} />)
    container.querySelector('dialog')?.dispatchEvent(new Event('close'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('falls back to the open attribute where showModal does not exist', () => {
    // Older engines, and some test environments, ship <dialog> without the
    // modal methods.
    const proto = window.HTMLDialogElement?.prototype
    if (!proto) return

    const showModal = proto.showModal
    const close = proto.close
    // @ts-expect-error deliberately removing the methods for this test
    proto.showModal = undefined
    // @ts-expect-error deliberately removing the methods for this test
    proto.close = undefined

    try {
      const { container, rerender } = render(
        <ConfirmDelete {...props} open onCancel={vi.fn()} />,
      )
      expect(container.querySelector('dialog')).toHaveAttribute('open')

      rerender(<ConfirmDelete {...props} open={false} onCancel={vi.fn()} />)
      expect(container.querySelector('dialog')).not.toHaveAttribute('open')
    } finally {
      proto.showModal = showModal
      proto.close = close
    }
  })
})
