import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { fakeCompany, fakeLastName } from '../../fixtures/fake.mjs'
import {
  AreaChart,
  BarChart,
  ButtonGroup,
  Calendar,
  CalendarPicker,
  Carousel,
  CarouselItem,
  ChartLegend,
  ContextMenu,
  DatePicker,
  Empty,
  Field,
  GraphView,
  HoverCard,
  InputOTP,
  Item,
  Kbd,
  LineChart,
  LocationMap,
  PieChart,
  WorldMap,
  Menubar,
  SERIES_COUNT,
  ScrollArea,
  Slider,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  dateHeading,
  monthHeading,
  monthOf,
  monthShape,
  parseMonth,
  seriesColor,
  shiftDate,
  shiftMonth,
  weekdayIndex,
} from '../index'
import { numericCountryId } from '../lib/iso-3166'

/*
 * The second shadcn wave.
 *
 * Specimen data throughout is drawn from `fixtures/fake.mjs` and addressed at
 * `example.com`, for the reason the gallery's is: a fixture is read by
 * everyone who clones the repository, and nobody should be able to type a real
 * docket into one.
 */

/* ------------------------------------------------------------------ Table -- */

describe('Table', () => {
  it('renders a caption, a footer, and numeric alignment', () => {
    render(
      <Table caption="Fees by stage">
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow selected>
            <TableCell>Discovery</TableCell>
            <TableCell numeric>412000</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell numeric>412000</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    )

    expect(screen.getByRole('table', { name: 'Fees by stage' })).toBeInTheDocument()
    // A header cell without a scope leaves a screen reader guessing.
    expect(screen.getByRole('columnheader', { name: 'Stage' })).toHaveAttribute('scope', 'col')
    expect(screen.getAllByRole('cell', { name: '412000' })[0]).toHaveClass(
      'nav-table__cell--numeric',
    )
  })

  it('marks a full-width table on the wrap', () => {
    const { container } = render(
      <Table span="full" caption="Wide fees">
        <TableBody>
          <TableRow>
            <TableCell>Filing</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(container.querySelector('.nav-table-wrap--full')).toBeInTheDocument()
  })

  it('marks the selected row so a stylesheet can reach it', () => {
    render(
      <Table>
        <TableBody>
          <TableRow selected>
            <TableCell>Chosen</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Other</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveAttribute('data-selected', 'true')
    expect(rows[1]).not.toHaveAttribute('data-selected')
  })

  it('accepts a column span', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>Spanning</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole('cell', { name: 'Spanning' })).toHaveAttribute('colspan', '3')
  })
})

/* ------------------------------------------------------------- Indicators -- */

describe('Spinner, Kbd, and Empty', () => {
  it('names the work rather than the widget', () => {
    render(<Spinner label="Opening the docket" size="lg" />)
    const status = screen.getByRole('status')
    expect(status).toHaveClass('nav-spinner--lg')
    expect(within(status).getByText('Opening the docket')).toBeInTheDocument()
  })

  it('defaults the spinner label', () => {
    render(<Spinner />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('renders a chord as a kbd element', () => {
    const { container } = render(<Kbd>Cmd K</Kbd>)
    expect(container.querySelector('kbd')).toHaveTextContent('Cmd K')
  })

  it('shows an empty state with an action', async () => {
    render(
      <Empty
        icon={<span>+</span>}
        title="No filings yet"
        description="Filings appear here once the first one is recorded."
        action={<button type="button">Record a filing</button>}
      />,
    )
    expect(screen.getByText('No filings yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record a filing' })).toBeInTheDocument()
  })

  it('renders without the optional slots', () => {
    render(<Empty title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})

/* ---------------------------------------------------------------- Layouts -- */

describe('ScrollArea, ButtonGroup, Carousel, and Item', () => {
  it('makes a scroll region focusable, or it is unreachable by keyboard', () => {
    render(
      <ScrollArea label="Docket" maxHeight="12rem">
        <p>Entry</p>
      </ScrollArea>,
    )
    const region = screen.getByRole('region', { name: 'Docket' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.style.maxHeight).toBe('12rem')
  })

  it('switches the scroll axis', () => {
    render(
      <ScrollArea label="Wide" horizontal>
        <p>Entry</p>
      </ScrollArea>,
    )
    expect(screen.getByRole('region', { name: 'Wide' })).toHaveClass('nav-scroll-area--x')
  })

  it('groups buttons under one label', () => {
    render(
      <ButtonGroup label="Document actions" vertical>
        <button type="button">Copy</button>
        <button type="button">Download</button>
      </ButtonGroup>,
    )
    const group = screen.getByRole('group', { name: 'Document actions' })
    expect(group).toHaveClass('nav-button-group--vertical')
    expect(within(group).getAllByRole('button')).toHaveLength(2)
  })

  it('pages a carousel by the visible width', async () => {
    const user = userEvent.setup()
    render(
      <Carousel label="Exhibits">
        <CarouselItem>A</CarouselItem>
        <CarouselItem>B</CarouselItem>
      </Carousel>,
    )

    const track = screen.getByText('A').parentElement as HTMLDivElement
    // jsdom reports zero for clientWidth and does not implement scrollBy.
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true })
    const scrollBy = vi.fn()
    track.scrollBy = scrollBy

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -300, behavior: 'smooth' })
  })

  it('hides the carousel controls on request', () => {
    render(
      <Carousel label="Exhibits" hideControls>
        <CarouselItem>A</CarouselItem>
      </Carousel>,
    )
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('renders an item row with every slot, and without them', () => {
    const { rerender } = render(
      <Item media={<span>M</span>} title="Notice of rescission" description="Filed 2 Aug" trailing={<span>PDF</span>} />,
    )
    expect(screen.getByText('Notice of rescission')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()

    rerender(<Item title="Bare" />)
    expect(screen.getByText('Bare')).toBeInTheDocument()
    expect(screen.queryByText('PDF')).not.toBeInTheDocument()
  })

  it('wires a field label, help, and error to the control', () => {
    render(
      <Field label="Docket" help="As filed" error="Required" required>
        {(id, describedBy) => <input id={id} aria-describedby={describedBy} />}
      </Field>,
    )
    const input = screen.getByLabelText(/Docket/)
    const describedBy = input.getAttribute('aria-describedby') ?? ''
    // Both the error and the help must be reachable, error first.
    expect(describedBy.split(' ')).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})

/* ----------------------------------------------------------------- Fields -- */

describe('Slider', () => {
  it('reports its value and formats the readout', async () => {
    function Harness() {
      const [value, setValue] = useState(40)
      return (
        <Slider
          label="Exposure"
          value={value}
          onValueChange={setValue}
          max={100}
          format={(v) => `$${v}k`}
          help="Drag to model"
        />
      )
    }
    render(<Harness />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('40')
    expect(screen.getByText('$40k')).toBeInTheDocument()
  })

  it('emits the numeric value on change', () => {
    const onValueChange = vi.fn()
    render(<Slider label="Weight" value={2} onValueChange={onValueChange} min={0} max={10} />)
    const slider = screen.getByRole('slider')
    slider.setAttribute('value', '7')
    // fireEvent through userEvent's change path: range inputs need a direct set.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(slider, '7')
    slider.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onValueChange).toHaveBeenCalledWith(7)
  })
})

describe('InputOTP', () => {
  it('fills every box from a single paste', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<InputOTP label="Code" value="" onValueChange={onValueChange} length={6} />)

    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(6)
    boxes[0]?.focus()
    await user.paste('123456')
    expect(onValueChange).toHaveBeenCalledWith('123456')
  })

  it('ignores an empty paste', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<InputOTP label="Code" value="" onValueChange={onValueChange} />)
    screen.getAllByRole('textbox')[0]?.focus()
    await user.paste('   ')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('offers the one-time code only on the first box', () => {
    render(<InputOTP label="Code" value="12" onValueChange={vi.fn()} length={3} />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes[0]).toHaveAttribute('autocomplete', 'one-time-code')
    expect(boxes[1]).toHaveAttribute('autocomplete', 'off')
  })

  it('walks backwards from an empty box on Backspace', async () => {
    const user = userEvent.setup()
    render(<InputOTP label="Code" value="" onValueChange={vi.fn()} length={3} />)
    const boxes = screen.getAllByRole('textbox')
    boxes[1]?.focus()
    await user.keyboard('{Backspace}')
    expect(boxes[0]).toHaveFocus()
  })

  it('moves with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<InputOTP label="Code" value="" onValueChange={vi.fn()} length={3} />)
    const boxes = screen.getAllByRole('textbox')
    boxes[1]?.focus()
    await user.keyboard('{ArrowLeft}')
    expect(boxes[0]).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(boxes[1]).toHaveFocus()
  })

  it('writes one character per box and advances', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<InputOTP label="Code" value="" onValueChange={onValueChange} length={3} help="Six digits" />)
    const boxes = screen.getAllByRole('textbox')
    boxes[0]?.focus()
    await user.keyboard('4')
    expect(onValueChange).toHaveBeenCalledWith('4')
  })

  it('shows an error in place of the help', () => {
    render(<InputOTP label="Code" value="" onValueChange={vi.fn()} error="That code expired" />)
    expect(screen.getByRole('alert')).toHaveTextContent('That code expired')
  })
})

describe('DatePicker', () => {
  it('posts an ISO value and enforces bounds in the platform', async () => {
    const onValueChange = vi.fn()
    render(
      <DatePicker
        label="Hearing"
        name="hearing"
        value="2026-09-12"
        min="2026-01-01"
        max="2026-12-31"
        onValueChange={onValueChange}
        required
      />,
    )
    const input = screen.getByLabelText(/Hearing/)
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAttribute('min', '2026-01-01')
    expect(input).toHaveValue('2026-09-12')
  })

  it('surfaces an error', () => {
    render(<DatePicker label="Hearing" name="hearing" error="Pick a weekday" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a weekday')
  })
})

describe('month arithmetic', () => {
  it('counts days and finds the Monday-based offset', () => {
    // August 2026 has 31 days and starts on a Saturday.
    expect(monthShape('2026-08')).toEqual({ days: 31, offset: 5 })
    // February 2024 was a leap February.
    expect(monthShape('2024-02').days).toBe(29)
  })

  it('falls back rather than producing NaN dates', () => {
    expect(parseMonth('nonsense')).toEqual({ year: 1970, monthNumber: 1 })
    expect(monthShape('nonsense').days).toBe(31)
  })

  it('shifts across a year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('reads a month as a heading', () => {
    expect(monthHeading('2026-08')).toBe('August 2026')
  })

  it('shifts a date across month and year boundaries', () => {
    expect(shiftDate('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
    // 2024 was a leap year; 2026 is not.
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('reads a date as a heading and a month', () => {
    expect(dateHeading('2026-08-14')).toBe('August 14, 2026')
    expect(monthOf('2026-08-14')).toBe('2026-08')
  })

  it('counts the week from Monday', () => {
    // August 14, 2026 is a Friday, so it is the fifth column.
    expect(weekdayIndex('2026-08-14')).toBe(4)
    expect(weekdayIndex('2026-08-16')).toBe(6)
    expect(weekdayIndex('2026-08-17')).toBe(0)
  })

  it('hands a malformed date back rather than laundering it into 1970', () => {
    // `parseMonth` substitutes the epoch; a date deliberately does not.
    expect(shiftDate('nonsense', 1)).toBe('nonsense')
    expect(dateHeading('nonsense')).toBe('nonsense')
    expect(weekdayIndex('nonsense')).toBe(0)
  })
})

describe('Calendar', () => {
  it('lays out the month with notes and a selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Calendar
        month="2026-08"
        selected="2026-08-14"
        onSelect={onSelect}
        days={[
          { date: '2026-08-14', note: 'Reply due' },
          { date: '2026-08-20', disabled: true },
        ]}
      />,
    )
    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(screen.getByText('Reply due')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'August 3, 2026' }))
    expect(onSelect).toHaveBeenCalledWith('2026-08-03')
  })

  it('disables navigation when no month handler is given', () => {
    render(<Calendar month="2026-08" />)
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  it('steps months', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<Calendar month="2026-08" onMonthChange={onMonthChange} />)
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onMonthChange).toHaveBeenCalledWith('2026-09')
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-07')
  })
})

describe('Calendar keyboard grid', () => {
  it('holds one tab stop and moves it with the arrows', async () => {
    const user = userEvent.setup()
    render(<Calendar month="2026-08" selected="2026-08-14" onSelect={vi.fn()} onMonthChange={vi.fn()} />)

    // The selection holds the tab stop; every other day is out of the tab order.
    const selected = screen.getByRole('button', { name: 'August 14, 2026' })
    expect(selected).not.toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('button', { name: 'August 15, 2026' })).toHaveAttribute('tabindex', '-1')

    selected.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'August 15, 2026' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'August 22, 2026' })).toHaveFocus()
  })

  it('steps over a day that cannot be chosen rather than stopping on it', async () => {
    const user = userEvent.setup()
    render(
      <Calendar
        month="2026-08"
        selected="2026-08-14"
        onSelect={vi.fn()}
        days={[{ date: '2026-08-15', disabled: true }, { date: '2026-08-16', disabled: true }]}
      />,
    )
    screen.getByRole('button', { name: 'August 14, 2026' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'August 17, 2026' })).toHaveFocus()
  })

  it('asks for the next month when an arrow leaves this one', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<Calendar month="2026-08" selected="2026-08-31" onSelect={vi.fn()} onMonthChange={onMonthChange} />)
    screen.getByRole('button', { name: 'August 31, 2026' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onMonthChange).toHaveBeenCalledWith('2026-09')
  })

  it('moves to the ends of the week, not the month, on Home and End', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<Calendar month="2026-08" selected="2026-08-14" onSelect={vi.fn()} onMonthChange={onMonthChange} />)
    // August 14, 2026 is a Friday, in the week of the 10th through the 16th.
    screen.getByRole('button', { name: 'August 14, 2026' }).focus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'August 10, 2026' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'August 16, 2026' })).toHaveFocus()
  })

  it('follows a week that runs into the next month', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<Calendar month="2026-08" selected="2026-08-31" onSelect={vi.fn()} onMonthChange={onMonthChange} />)
    // August 31 is a Monday; its week ends on September 6.
    screen.getByRole('button', { name: 'August 31, 2026' }).focus()
    await user.keyboard('{End}')
    expect(onMonthChange).toHaveBeenCalledWith('2026-09')
  })

  it('pages by month and clamps a day number the next month does not have', async () => {
    const user = userEvent.setup()
    const onMonthChange = vi.fn()
    render(<Calendar month="2026-08" selected="2026-08-31" onSelect={vi.fn()} onMonthChange={onMonthChange} />)
    screen.getByRole('button', { name: 'August 31, 2026' }).focus()
    // September has 30 days, so the 31st has nowhere to land.
    await user.keyboard('{PageDown}')
    expect(onMonthChange).toHaveBeenCalledWith('2026-09')
  })

  it('renders bounds as unchoosable days', () => {
    render(<Calendar month="2026-08" onSelect={vi.fn()} min="2026-08-10" max="2026-08-20" />)
    expect(screen.getByRole('button', { name: 'August 9, 2026' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'August 10, 2026' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'August 21, 2026' })).toBeDisabled()
  })
})

describe('CalendarPicker', () => {
  it('opens a grid, posts the chosen date, and closes onto the trigger', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { container } = render(
      <CalendarPicker
        label="Hearing date"
        name="hearing"
        value="2026-08-14"
        defaultMonth="2026-08"
        onValueChange={onValueChange}
        days={[{ date: '2026-08-18', note: 'Reply due' }]}
      />,
    )

    // The trigger reads the field name and then the value, which a <label for>
    // does not give a button on its own.
    const trigger = screen.getByRole('button', { name: 'Hearing date August 14, 2026' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('input[name="hearing"]')).toHaveValue('2026-08-14')

    await user.click(trigger)
    expect(screen.getByText('Reply due')).toBeInTheDocument()

    // The note stays in the name rather than being replaced by the date.
    await user.click(screen.getByRole('button', { name: 'August 18, 2026 Reply due' }))
    expect(onValueChange).toHaveBeenCalledWith('2026-08-18')
    expect(screen.queryByText('Reply due')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('shows a placeholder and posts an empty value until a date is chosen', () => {
    const { container } = render(
      <CalendarPicker label="Hearing date" name="hearing" placeholder="Not yet set" />,
    )
    expect(screen.getByRole('button', { name: 'Hearing date Not yet set' })).toBeInTheDocument()
    expect(container.querySelector('input[name="hearing"]')).toHaveValue('')
  })

  it('closes on Escape without choosing', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <CalendarPicker label="Hearing date" name="hearing" defaultMonth="2026-08" onValueChange={onValueChange} />,
    )
    const trigger = screen.getByRole('button', { name: /Hearing date/ })
    await user.click(trigger)
    expect(screen.getByText('August 2026')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('August 2026')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('reports an error to the trigger', () => {
    render(<CalendarPicker label="Hearing date" name="hearing" error="Pick a weekday" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a weekday')
    expect(screen.getByRole('button', { name: /Hearing date/ })).toHaveAttribute('aria-invalid', 'true')
  })
})

/* ------------------------------------------------------------------ Menus -- */

describe('HoverCard', () => {
  it('opens on focus and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard trigger={<span>Ronnow</span>}>
        <p>330 P.2d 497 (Nev. 1958)</p>
      </HoverCard>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ContextMenu', () => {
  it('opens at the pointer and runs the chosen action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ContextMenu items={[{ label: 'Open', onSelect }, { label: 'Delete', onSelect: vi.fn(), danger: true }]}>
        <p>Row</p>
      </ContextMenu>,
    )

    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Row') })
    const menu = screen.getByRole('menu', { name: 'Actions' })
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2)

    await user.click(within(menu).getByRole('menuitem', { name: 'Open' }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks a destructive action', async () => {
    const user = userEvent.setup()
    render(
      <ContextMenu items={[{ label: 'Delete', onSelect: vi.fn(), danger: true, disabled: true }]}>
        <p>Row</p>
      </ContextMenu>,
    )
    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Row') })
    const item = screen.getByRole('menuitem', { name: 'Delete' })
    expect(item).toHaveClass('nav-menu__item--danger')
    expect(item).toBeDisabled()
  })
})

describe('Menubar', () => {
  const menus = [
    { label: 'Matter', items: [{ label: 'New', onSelect: vi.fn() }] },
    { label: 'Filing', items: [{ label: 'E-file', onSelect: vi.fn() }] },
  ]

  it('opens a menu and runs an item', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Menubar menus={[{ label: 'Matter', items: [{ label: 'New', onSelect }] }]} />)

    await user.click(screen.getByRole('menuitem', { name: 'Matter' }))
    await user.click(screen.getByRole('menuitem', { name: 'New' }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('moves between menus with the arrow keys, wrapping', async () => {
    const user = userEvent.setup()
    render(<Menubar menus={menus} />)
    const matter = screen.getByRole('menuitem', { name: 'Matter' })

    matter.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('menuitem', { name: 'Filing' })).toHaveAttribute('aria-expanded', 'true')

    matter.focus()
    await user.keyboard('{ArrowLeft}')
    // Wraps to the last menu rather than dead-ending at the first.
    expect(screen.getByRole('menuitem', { name: 'Filing' })).toHaveAttribute('aria-expanded', 'true')

    matter.focus()
    await user.keyboard('{ArrowDown}')
    expect(matter).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles a menu shut on a second click', async () => {
    const user = userEvent.setup()
    render(<Menubar menus={menus} />)
    const trigger = screen.getByRole('menuitem', { name: 'Matter' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

/* ----------------------------------------------------------------- Charts -- */

const SERIES = [
  { label: 'Q1', value: 12 },
  { label: 'Q2', value: 30 },
  { label: 'Q3', value: 22 },
]

describe('Charts', () => {
  it('wraps the series palette at six', () => {
    expect(SERIES_COUNT).toBe(6)
    expect(seriesColor(0)).toBe('var(--nav-chart-1)')
    expect(seriesColor(6)).toBe('var(--nav-chart-1)')
    expect(seriesColor(7)).toBe('var(--nav-chart-2)')
    // Caller error falls back rather than producing an uncolored mark.
    expect(seriesColor(-1)).toBe('var(--nav-chart-2)')
    expect(seriesColor(1.7)).toBe('var(--nav-chart-2)')
  })

  it('summarizes a bar chart rather than naming the widget', () => {
    render(<BarChart data={SERIES} label="Exposure by quarter" format={(v) => `$${v}k`} />)
    const chart = screen.getByRole('img')
    expect(chart).toHaveAccessibleName(
      'Exposure by quarter. 3 points from Q1 to Q3, ranging $12k to $30k. Ends at $22k.',
    )
  })

  it('says so when there is nothing to plot', () => {
    render(<BarChart data={[]} label="Empty" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Empty: no data')
  })

  it('draws a line and an area', () => {
    const { container, rerender } = render(<LineChart data={SERIES} label="Trend" />)
    expect(container.querySelector('.nav-chart__line')).toBeInTheDocument()
    expect(container.querySelector('.nav-chart__area')).not.toBeInTheDocument()

    rerender(<AreaChart data={SERIES} label="Trend" />)
    expect(container.querySelector('.nav-chart__area')).toBeInTheDocument()
  })

  it('survives a flat series without dividing by zero', () => {
    const flat = [
      { label: 'A', value: 5 },
      { label: 'B', value: 5 },
    ]
    const { container } = render(<LineChart data={flat} label="Flat" />)
    const path = container.querySelector('.nav-chart__line')?.getAttribute('d') ?? ''
    expect(path).not.toContain('NaN')
  })

  it('draws no point markers on a trend', () => {
    const { container } = render(<LineChart data={SERIES} label="Trend" />)
    expect(container.querySelector('circle')).not.toBeInTheDocument()
  })

  it('fades the area from the series color and keeps the stroke on top', () => {
    const { container } = render(<AreaChart data={SERIES} label="Trend" series={2} />)
    const stops = container.querySelectorAll('linearGradient stop')
    expect(Array.from(stops, (stop) => stop.getAttribute('stop-color'))).toEqual([
      seriesColor(2),
      seriesColor(2),
    ])
    const top = Number(stops[0]?.getAttribute('stop-opacity'))
    const bottom = Number(stops[1]?.getAttribute('stop-opacity'))
    expect(top).toBeGreaterThan(bottom)
    const paths = Array.from(container.querySelectorAll('path'))
    expect(paths.indexOf(container.querySelector('.nav-chart__line') as SVGPathElement)).toBeGreaterThan(
      paths.indexOf(container.querySelector('.nav-chart__area') as SVGPathElement),
    )
  })

  it('rounds the top of each bar and leaves its base square', () => {
    const { container } = render(<BarChart data={SERIES} label="Bars" />)
    const bars = container.querySelectorAll('.nav-chart__bar')
    expect(bars).toHaveLength(SERIES.length)
    for (const bar of bars) {
      const d = bar.getAttribute('d') ?? ''
      expect(d).not.toContain('NaN')
      // Two quadratic corners, both at the top.
      expect(d.match(/Q/g)).toHaveLength(2)
      expect(bar).toHaveAttribute('fill', seriesColor(0))
    }
  })

  it('draws a zero-height bar without a corner it cannot carry', () => {
    const { container } = render(
      <BarChart
        data={[
          { label: 'A', value: 0 },
          { label: 'B', value: 4 },
        ]}
        label="Zero"
      />,
    )
    const flat = container.querySelector('.nav-chart__bar')?.getAttribute('d') ?? ''
    expect(flat).not.toContain('NaN')
    expect(flat).not.toContain('-')
  })

  it('renders a legend keyed to the series colors', () => {
    render(<ChartLegend entries={[{ label: 'Fees', series: 0 }, { label: 'Costs', series: 1 }]} />)
    expect(screen.getByText('Fees')).toBeInTheDocument()
    expect(screen.getByText('Costs')).toBeInTheDocument()
  })

  it('summarizes a pie by the largest slice', () => {
    render(
      <PieChart
        data={[
          { label: 'Contract', value: 50 },
          { label: 'Tort', value: 30 },
          { label: 'Equity', value: 20 },
        ]}
        label="Posture"
        format={(value) => `${value}%`}
      />,
    )
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Posture. 3 slices totaling 100%. Largest is Contract at 50% (50%).',
    )
    expect(screen.getByText('Contract')).toBeInTheDocument()
  })

  it('drops non-positive slices and says so when none remain', () => {
    render(
      <PieChart
        data={[
          { label: 'None', value: 0 },
          { label: 'Debt', value: -4 },
        ]}
        label="Empty pie"
      />,
    )
    expect(screen.getByRole('img')).toHaveAccessibleName('Empty pie: no data')
  })

  it('opens a hole when innerRadius is set', () => {
    const pie = render(<PieChart data={SERIES} label="Share" />)
    const solid = pie.container.querySelector('.nav-chart__slice')?.getAttribute('d') ?? ''
    pie.rerender(<PieChart data={SERIES} label="Share" innerRadius={0.55} />)
    const donut = pie.container.querySelector('.nav-chart__slice')?.getAttribute('d') ?? ''
    expect(solid).not.toBe(donut)
    expect(donut).not.toContain('NaN')
    // A rounded donut slice is drawn with arcs at its corners as well as along
    // its edges, so it carries more arc commands than the solid wedge.
    const arcs = (path: string) => (path.match(/A/g) ?? []).length
    expect(arcs(donut)).toBeGreaterThan(arcs(solid))
  })
})

describe('iso-3166', () => {
  it('resolves alpha-3, numeric, and padded numeric ids', () => {
    expect(numericCountryId('USA')).toBe('840')
    expect(numericCountryId('840')).toBe('840')
    expect(numericCountryId('36')).toBe('036')
    expect(numericCountryId('')).toBeNull()
    expect(numericCountryId('Atlantis')).toBeNull()
  })
})

describe('WorldMap', () => {
  const REGIONS = [
    { id: 'USA', value: 40 },
    { id: '826', value: 12 },
    { id: 'Canada', value: 8 },
  ]

  it('summarizes the highest region rather than naming the widget', () => {
    render(<WorldMap data={REGIONS} label="Admissions" format={(value) => `${value}`} />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Admissions. 3 regions. Highest is United States of America at 40.',
    )
  })

  it('says so when there is nothing to paint', () => {
    render(<WorldMap data={[]} label="Empty map" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Empty map: no data')
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()
  })

  it('marks valued countries and leaves the rest as land', () => {
    const { container } = render(<WorldMap data={REGIONS} label="Admissions" />)
    const usa = container.querySelector('[data-country="840"]')
    expect(usa).toHaveClass('nav-chart__land--valued')
    expect(usa).toHaveAttribute('fill', 'var(--nav-chart-1)')
    expect(container.querySelector('[data-country="826"]')).toHaveClass('nav-chart__land--valued')
    expect(container.querySelector('[data-country="124"]')).toHaveClass('nav-chart__land--valued')
    expect(container.querySelector('[data-country="076"]')).not.toHaveClass('nav-chart__land--valued')
  })

  it('reports the clicked country', () => {
    const onSelect = vi.fn()
    const { container } = render(<WorldMap data={REGIONS} label="Admissions" onSelect={onSelect} />)
    const usa = container.querySelector('[data-country="840"]')
    expect(usa).toHaveClass('nav-chart__land--selectable')
    fireEvent.click(usa!)
    expect(onSelect).toHaveBeenCalledWith({
      id: '840',
      name: 'United States of America',
      value: 40,
    })
  })
})

describe('LocationMap', () => {
  const FEATURES = [
    {
      id: 'road-1',
      kind: 'road' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-73.99, 40.72],
          [-73.98, 40.73],
        ],
      },
    },
  ]

  it('renders supplied geometry locally and attributes OpenStreetMap', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { container } = render(
      <LocationMap
        features={FEATURES}
        center={{ latitude: 40.725, longitude: -73.985 }}
        label="Matter location"
      />,
    )

    expect(screen.getByRole('img', { name: 'Matter location' })).toBeInTheDocument()
    expect(container.querySelector('[data-feature-kind="road"]')).toBeInTheDocument()
    expect(container.querySelector('[data-location-marker]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'OpenStreetMap contributors' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    )
    expect(screen.getByRole('link', { name: 'Open this area in OpenStreetMap' })).toHaveAttribute(
      'href',
      expect.stringContaining('mlat=40.725'),
    )
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does not project invalid coordinates', () => {
    render(
      <LocationMap
        features={[]}
        center={{ latitude: 91, longitude: -73 }}
        label="Matter location"
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Map location is unavailable.')
  })
})

/* -------------------------------------------------------------- GraphView -- */

const PLAINTIFF = fakeLastName('wave-two/plaintiff')
const DEFENDANT = fakeCompany('wave-two/defendant')

const NODES = [
  { id: 'a', label: PLAINTIFF, kind: 'party', fields: { role: 'Plaintiff' } },
  { id: 'b', label: DEFENDANT, kind: 'party', fields: { role: 'Defendant' } },
  { id: 'c', label: 'Agreement', kind: 'instrument' },
]
const EDGES = [
  { source: 'a', target: 'b', kind: 'adverse' },
  { source: 'a', target: 'c', kind: 'instrument' },
]

describe('GraphView', () => {
  it('reports its size to a reader who cannot see it', () => {
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Record graph. 3 nodes, 2 connections.',
    )
  })

  it('filters a kind out of the graph and back', async () => {
    const user = userEvent.setup()
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)

    await user.click(screen.getByRole('button', { name: 'party' }))
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Record graph. 1 nodes, 0 connections.',
    )

    await user.click(screen.getByRole('button', { name: 'party' }))
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Record graph. 3 nodes, 2 connections.',
    )
  })

  it('reads a record into the panel on select', async () => {
    const user = userEvent.setup()
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)
    expect(screen.getByText('Select a node to read its record.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `${PLAINTIFF}, party` }))
    expect(screen.getByText('Plaintiff')).toBeInTheDocument()
  })

  it('selects with the keyboard', async () => {
    const user = userEvent.setup()
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)
    const node = screen.getByRole('button', { name: `${PLAINTIFF}, party` })
    node.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Plaintiff')).toBeInTheDocument()
  })

  it('edits a field when a handler is supplied', async () => {
    const user = userEvent.setup()
    const onFieldChange = vi.fn()
    render(
      <GraphView nodes={NODES} edges={EDGES} label="Record graph" onFieldChange={onFieldChange} />,
    )
    await user.click(screen.getByRole('button', { name: `${PLAINTIFF}, party` }))
    await user.type(screen.getByLabelText(`${PLAINTIFF} role`), '!')
    expect(onFieldChange).toHaveBeenCalledWith('a', 'role', 'Plaintiff!')
  })

  it('hides the panel on request', () => {
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" showPanel={false} />)
    expect(screen.queryByText('Select a node to read its record.')).not.toBeInTheDocument()
  })
})

/* ---------------------------------------------------------------- dragging -- */

describe('GraphView dragging', () => {
  /** jsdom lays nothing out, so the SVG has to be told how big it is. */
  function sizeCanvas() {
    const svg = document.querySelector('.nav-graph__canvas') as SVGSVGElement
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 460 }) as DOMRect
    return svg
  }

  it('pins a node while dragging and releases it on drop', () => {
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)
    sizeCanvas()
    const node = screen.getByRole('button', { name: `${PLAINTIFF}, party` })

    fireEvent.pointerDown(node, { pointerId: 1 })
    fireEvent.pointerMove(node, { pointerId: 1, clientX: 400, clientY: 230 })
    fireEvent.pointerUp(node, { pointerId: 1 })

    // The graph is still readable afterwards — the drag did not detach it.
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Record graph. 3 nodes, 2 connections.',
    )
  })

  it('ignores a pointer move with no drag in progress', () => {
    render(<GraphView nodes={NODES} edges={EDGES} label="Record graph" />)
    sizeCanvas()
    const node = screen.getByRole('button', { name: `${PLAINTIFF}, party` })

    // No pointerDown first, so this must be a no-op rather than a throw.
    expect(() => fireEvent.pointerMove(node, { clientX: 10, clientY: 10 })).not.toThrow()
    expect(() => fireEvent.pointerUp(node)).not.toThrow()
  })

  it('renders an unknown node kind without a color lookup failure', () => {
    render(
      <GraphView
        nodes={[{ id: 'z', label: 'Lone', kind: 'unheard-of' }]}
        edges={[]}
        label="Sparse"
      />,
    )
    expect(screen.getByRole('img')).toHaveAccessibleName('Sparse. 1 nodes, 0 connections.')
  })
})
