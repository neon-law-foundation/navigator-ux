import { useState, type ComponentType, type ReactNode } from 'react'

import {
  CAPTION,
  DEFENDANT_SHORT,
  DEPONENT_SHORT,
  OPPOSING_COUNSEL_SHORT,
  PLAINTIFF,
} from '../fixtures/matter.mjs'
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
  GraphView,
  HoverCard,
  InputOTP,
  Item,
  Kbd,
  LineChart,
  Menubar,
  NavButton,
  PieChart,
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
  WorldMap,
  type GraphNode,
} from '../src/index'

/*
 * The second shadcn wave, illustrated.
 *
 * Two of these carry a runtime dependency and the rest do not, which is the one
 * distinction worth drawing on the page: the charts and the graph are d3, the
 * PDF viewer is pdf.js, and everything else is still platform markup.
 *
 * The specimen data is invented, like the rest of the gallery's.
 */

interface SectionProps {
  title: string
  note?: ReactNode
  children: ReactNode
}

const EXPOSURE = [
  { label: 'Q1', value: 128 },
  { label: 'Q2', value: 206 },
  { label: 'Q3', value: 174 },
  { label: 'Q4', value: 261 },
]

const THROUGHPUT = [
  { label: 'Mar', value: 14 },
  { label: 'Apr', value: 22 },
  { label: 'May', value: 19 },
  { label: 'Jun', value: 31 },
  { label: 'Jul', value: 27 },
  { label: 'Aug', value: 38 },
]

const GRAPH_NODES: GraphNode[] = [
  {
    id: 'plaintiff',
    label: PLAINTIFF.lastName,
    kind: 'party',
    fields: { role: 'Plaintiff', counsel: OPPOSING_COUNSEL_SHORT },
  },
  {
    id: 'defendant',
    label: DEFENDANT_SHORT,
    kind: 'party',
    fields: { role: 'Defendant', counsel: DEPONENT_SHORT },
  },
  { id: 'supply', label: 'Supply', kind: 'instrument', fields: { dated: '14 March 2023', term: '36 months' } },
  { id: 'cure', label: 'Cure', kind: 'term', fields: { window: '30 days', triggered: '2 August 2026' } },
  { id: 'notice', label: 'Notice', kind: 'evidence', fields: { filed: '5 August 2026' } },
]

const GRAPH_EDGES = [
  { source: 'plaintiff', target: 'defendant', kind: 'adverse', label: 'disputes' },
  { source: 'plaintiff', target: 'supply', kind: 'instrument', label: 'party to' },
  { source: 'defendant', target: 'supply', kind: 'instrument', label: 'party to' },
  { source: 'supply', target: 'cure', kind: 'instrument', label: 'contains' },
  { source: 'notice', target: 'cure', kind: 'evidence', label: 'evidences' },
]

export function ShadcnWaveTwo({ Section }: { Section: ComponentType<SectionProps> }) {
  const [exposure, setExposure] = useState(65)
  const [code, setCode] = useState('')
  const [month, setMonth] = useState('2026-08')
  const [day, setDay] = useState('2026-08-14')
  const [hearing, setHearing] = useState('2026-09-12')
  const [deposition, setDeposition] = useState('2026-08-21')
  const [nodes, setNodes] = useState(GRAPH_NODES)

  return (
    <>
      <Section
        title="Data and documents"
        note={
          <>
            The two surfaces here that carry a dependency: charts and the record graph run on{' '}
            <code>d3</code>. Bars, pies, and the world map use the same <code>--nav-chart-*</code>{' '}
            tokens. d3 does the arithmetic and never touches the DOM — React owns every element on
            this page.
          </>
        }
      >
        <div className="gallery__grid">
          <div>
            <BarChart
              data={EXPOSURE}
              label="Exposure by quarter"
              format={(value) => `$${value}k`}
            />
            <ChartLegend entries={[{ label: 'Exposure', series: 0 }]} />
          </div>
          <div>
            <PieChart
              data={[
                { label: 'Contract', value: 48 },
                { label: 'Tort', value: 22 },
                { label: 'Equity', value: 17 },
                { label: 'Other', value: 13 },
              ]}
              label="Open matters by posture"
              format={(value) => `${value}%`}
              innerRadius={0.6}
            />
          </div>
        </div>
        <WorldMap
          data={[
            { id: 'USA', value: 42 },
            { id: 'GBR', value: 18 },
            { id: 'CAN', value: 11 },
            { id: 'AUS', value: 9 },
            { id: 'DEU', value: 7 },
            { id: 'JPN', value: 4 },
            { id: 'BRA', value: 3 },
            { id: 'ZAF', value: 2 },
          ]}
          label="Counsel admitted, by jurisdiction"
          format={(value) => `${value}`}
        />
        <div className="gallery__grid">
          <div>
            <AreaChart data={THROUGHPUT} label="Matters closed by month" series={3} />
            <ChartLegend entries={[{ label: 'Closed', series: 3 }]} />
          </div>
          <div>
            <LineChart data={THROUGHPUT} label="Matters closed, trend" series={1} />
          </div>
        </div>
      </Section>

      <Section
        title="Record graph"
        note={
          <>
            A matter&rsquo;s records as a force-directed web, which is the shape a graph store
            already holds them in. Drag a node; click one to read its record beside the picture, and
            edit it in place. A graph you can only look at makes you go somewhere else to find out
            what a node actually says.
          </>
        }
      >
        <GraphView
          nodes={nodes}
          edges={GRAPH_EDGES}
          label={`${CAPTION} record graph`}
          onFieldChange={(nodeId, field, value) =>
            setNodes((current) =>
              current.map((node) =>
                node.id === nodeId ? { ...node, fields: { ...node.fields, [field]: value } } : node,
              ),
            )
          }
        />
      </Section>

      <Section
        title="Table"
        note={
          <>
            The composable counterpart to <code>DataTable</code>. Reach for this where the data is
            not rectangular — a merged header, a spanning row, a footer that sums a column.
          </>
        }
      >
        <Table caption={`Fees by stage, ${CAPTION}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead numeric>Hours</TableHead>
              <TableHead numeric>Fees</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Pleadings</TableCell>
              <TableCell>{OPPOSING_COUNSEL_SHORT}</TableCell>
              <TableCell numeric>42.5</TableCell>
              <TableCell numeric>$18,700</TableCell>
            </TableRow>
            <TableRow selected>
              <TableCell>Discovery</TableCell>
              <TableCell>{OPPOSING_COUNSEL_SHORT}</TableCell>
              <TableCell numeric>96.0</TableCell>
              <TableCell numeric>$42,240</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Motions</TableCell>
              <TableCell>J. Iqbal</TableCell>
              <TableCell numeric>18.25</TableCell>
              <TableCell numeric>$8,030</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell numeric>156.75</TableCell>
              <TableCell numeric>$68,970</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>

      <Section
        title="Dates"
        note={
          <>
            <code>DatePicker</code> is <code>&lt;input type=&quot;date&quot;&gt;</code> — localized,
            autofillable, and free. <code>Calendar</code> is for the case that input cannot serve:
            when the month itself is the information. <code>CalendarPicker</code> is that grid in a
            popover, for picking a date against what the other days already carry.
          </>
        }
      >
        <div className="gallery__grid">
          <DatePicker
            label="Hearing date"
            name="hearing"
            value={hearing}
            onValueChange={setHearing}
            min="2026-01-01"
            help="Nevada, Eighth Judicial District"
          />
          <CalendarPicker
            label="Deposition date"
            name="deposition"
            value={deposition}
            onValueChange={setDeposition}
            defaultMonth="2026-08"
            min="2026-08-03"
            days={[
              { date: '2026-08-14', note: 'Reply due' },
              { date: '2026-08-21', note: 'Hearing' },
              { date: '2026-08-29', disabled: true },
            ]}
            help="Arrow keys move day to day; the grid holds one tab stop."
          />
          <Calendar
            month={month}
            onMonthChange={setMonth}
            selected={day}
            onSelect={setDay}
            days={[
              { date: '2026-08-14', note: 'Reply due' },
              { date: '2026-08-21', note: 'Hearing' },
              { date: '2026-08-29', disabled: true },
            ]}
          />
        </div>
      </Section>

      <Section title="Inputs">
        <Slider
          label="Settlement authority"
          value={exposure}
          onValueChange={setExposure}
          max={250}
          format={(value) => `$${value}k`}
          help="Drag to model a range."
        />
        <InputOTP
          label="Verification code"
          value={code}
          onValueChange={setCode}
          help="Paste the whole code into any box — every box fills."
        />
      </Section>

      <Section
        title="Menus"
        note={
          <>
            The three with no platform primitive underneath. A right-click menu takes away the
            browser&rsquo;s own, so every action in one must also be reachable somewhere clickable.
          </>
        }
      >
        <Menubar
          menus={[
            {
              label: 'Matter',
              items: [
                { label: 'New matter', onSelect: () => {} },
                { label: 'Close matter', onSelect: () => {}, danger: true },
              ],
            },
            {
              label: 'Filing',
              items: [
                { label: 'E-file', onSelect: () => {} },
                { label: 'Certified mail', onSelect: () => {} },
              ],
            },
          ]}
        />
        <p>
          The cure period ran thirty days from{' '}
          <HoverCard trigger="written notice">
            <strong>Supply agreement &sect; 9.2</strong>
            <p>
              &ldquo;Either party may terminate for cause upon thirty (30) days&rsquo; written
              notice, during which the breaching party may cure.&rdquo;
            </p>
          </HoverCard>
          , which is the pivot in this matter.
        </p>
        <ContextMenu
          items={[
            { label: 'Open document', onSelect: () => {} },
            { label: 'Copy citation', onSelect: () => {} },
            { label: 'Withdraw', onSelect: () => {}, danger: true },
          ]}
        >
          <Item
            title="Notice of rescission"
            description="Right-click this row for its actions."
            trailing={<Kbd>&#8984; K</Kbd>}
          />
        </ContextMenu>
      </Section>

      <Section title="Containers and states">
        <ButtonGroup label="Document actions">
          <NavButton variant="outline">Copy</NavButton>
          <NavButton variant="outline">Download</NavButton>
          <NavButton variant="outline">Share</NavButton>
        </ButtonGroup>

        <Carousel label="Exhibits">
          {['A — Supply agreement', 'B — Termination notice', 'C — Cure correspondence', 'D — Invoice ledger'].map(
            (exhibit) => (
              <CarouselItem key={exhibit}>
                <div className="gallery__slide">{exhibit}</div>
              </CarouselItem>
            ),
          )}
        </Carousel>

        <ScrollArea label="Docket" maxHeight="9rem">
          <div className="gallery__scroll-body">
            {Array.from({ length: 12 }, (_, index) => (
              <Item
                key={index}
                title={`Docket entry ${index + 1}`}
                description="Filed by counsel for the plaintiff."
              />
            ))}
          </div>
        </ScrollArea>

        <div className="gallery__row">
          <Spinner size="sm" label="Loading the docket" />
          <Spinner label="Loading the docket" />
          <Spinner size="lg" label="Loading the docket" />
        </div>

        <Empty
          title="No filings yet"
          description="Filings appear here once the first one is recorded against this matter."
          action={<NavButton variant="primary">Record a filing</NavButton>}
        />
      </Section>
    </>
  )
}
