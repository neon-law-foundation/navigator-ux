import { max as d3Max, min as d3Min } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { area as d3Area, arc as d3Arc, line as d3Line, pie as d3Pie, curveMonotoneX, type PieArcDatum } from 'd3-shape'
import { useId, useMemo, type ReactNode } from 'react'

import { seriesColor } from '../lib/chart-series'

/*
 * Bar, Line, Area, and Pie charts on d3.
 *
 * d3 does the arithmetic and never touches the DOM. `scaleBand`, `scaleLinear`,
 * `line`, `area`, `pie`, and `arc` are pure functions from data to numbers and
 * path strings; React renders the SVG. That split is the whole reason d3 and
 * React can share a component without fighting over who owns the element, and
 * it is why none of these needs a ref or an effect.
 *
 * shadcn's Chart wraps Recharts. Recharts is a renderer as well as a chart
 * library, so it brings its own reconciliation and its own opinions about SVG;
 * using d3's math modules directly is a fraction of the weight and leaves the
 * markup — and therefore the accessibility and the token colors — here.
 *
 * Series colors come from `--nav-chart-*` through `var()` in presentation
 * attributes. A hex here would be the one place in the library that does not
 * follow the theme into dark mode, and `check:tokens` fails the build over it.
 */

export interface ChartPoint {
  /** Category or time bucket. Used verbatim as the axis tick. */
  label: string
  value: number
}

export interface ChartProps {
  data: ChartPoint[]
  /** Describes the chart. Required — an unlabelled chart reports nothing. */
  label: string
  /** Drawn height. Width is fluid; the viewBox scales. */
  height?: number
  /** Index into the six series colors. */
  series?: number
  /** Format for the value axis and the accessible summary. */
  format?: (value: number) => string
}

const MARGIN = { top: 12, right: 12, bottom: 28, left: 44 }
const WIDTH = 640

/** The plot area once the axis gutters are taken out. */
function plotSize(height: number) {
  return {
    inner: WIDTH - MARGIN.left - MARGIN.right,
    innerHeight: height - MARGIN.top - MARGIN.bottom,
  }
}

/**
 * A one-sentence summary of the series, for readers who get the `<title>`
 * rather than the picture.
 *
 * A chart whose only accessible name is "Bar chart" has told a screen-reader
 * user nothing at all. Range and direction is the least that is useful.
 */
function summarize(data: ChartPoint[], label: string, format: (value: number) => string): string {
  const first = data[0]
  const last = data[data.length - 1]
  if (!first || !last) return `${label}: no data`
  const values = data.map((point) => point.value)
  const lowest = d3Min(values) ?? 0
  const highest = d3Max(values) ?? 0
  return `${label}. ${data.length} points from ${first.label} to ${last.label}, ranging ${format(lowest)} to ${format(highest)}. Ends at ${format(last.value)}.`
}

/** Corner radius of a bar's top, in viewBox units. */
const BAR_RADIUS = 4

/**
 * A bar as a path: square at the baseline, rounded at the top. An `rx` would
 * round all four corners and lift the bar off the axis it stands on. The
 * radius shrinks for a bar too thin or too short to carry it.
 */
function barPath(x: number, y: number, width: number, height: number, radius = BAR_RADIUS): string {
  const r = Math.max(0, Math.min(radius, width / 2, height))
  const bottom = y + height
  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${bottom}`,
    'Z',
  ].join('')
}

function Gridlines({ ticks, scale, inner }: { ticks: number[]; scale: (v: number) => number; inner: number }) {
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <line
          key={tick}
          className="nav-chart__grid"
          x1={0}
          x2={inner}
          y1={scale(tick)}
          y2={scale(tick)}
        />
      ))}
    </g>
  )
}

function ValueAxis({
  ticks,
  scale,
  format,
}: {
  ticks: number[]
  scale: (v: number) => number
  format: (value: number) => string
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <text key={tick} className="nav-chart__tick" x={-8} y={scale(tick)} dy="0.32em" textAnchor="end">
          {format(tick)}
        </text>
      ))}
    </g>
  )
}

/**
 * A categorical bar chart.
 *
 * The value axis starts at zero and is not configurable, because a truncated
 * bar axis misstates the ratio between bars — which is the only thing a bar
 * chart is for. Use `LineChart` when the interesting range does not include
 * zero.
 */
export function BarChart({
  data,
  label,
  height = 260,
  series = 0,
  format = String,
}: ChartProps) {
  const titleId = useId()
  const { inner, innerHeight } = plotSize(height)

  const { x, y, ticks } = useMemo(() => {
    const xScale = scaleBand<string>()
      .domain(data.map((point) => point.label))
      .range([0, inner])
      .padding(0.24)
    const yScale = scaleLinear()
      .domain([0, d3Max(data, (point) => point.value) ?? 1])
      .nice()
      .range([innerHeight, 0])
    return { x: xScale, y: yScale, ticks: yScale.ticks(4) }
  }, [data, inner, innerHeight])

  return (
    <figure className="nav-chart">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{summarize(data, label, format)}</title>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <Gridlines ticks={ticks} scale={y} inner={inner} />
          <ValueAxis ticks={ticks} scale={y} format={format} />
          {data.map((point) => (
            <path
              key={point.label}
              className="nav-chart__bar"
              d={barPath(
                x(point.label) ?? 0,
                y(point.value),
                x.bandwidth(),
                Math.max(0, innerHeight - y(point.value)),
              )}
              fill={seriesColor(series)}
            />
          ))}
          {data.map((point) => (
            <text
              key={point.label}
              className="nav-chart__tick"
              x={(x(point.label) ?? 0) + x.bandwidth() / 2}
              y={innerHeight + 18}
              textAnchor="middle"
              aria-hidden="true"
            >
              {point.label}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  )
}

/** Line and area share everything but the fill, so they share an implementation. */
function Trend({
  data,
  label,
  height = 260,
  series = 0,
  format = String,
  filled,
}: ChartProps & { filled: boolean }) {
  const titleId = useId()
  const { inner, innerHeight } = plotSize(height)

  const { linePath, areaPath, ticks, y, x } = useMemo(() => {
    const xScale = scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([0, inner])
    const lowest = d3Min(data, (point) => point.value) ?? 0
    const highest = d3Max(data, (point) => point.value) ?? 1
    // A flat series would otherwise get a zero-height domain and divide by zero.
    const yScale = scaleLinear()
      .domain(lowest === highest ? [lowest - 1, highest + 1] : [lowest, highest])
      .nice()
      .range([innerHeight, 0])

    const makeLine = d3Line<ChartPoint>()
      .x((_, index) => xScale(index))
      .y((point) => yScale(point.value))
      .curve(curveMonotoneX)
    const makeArea = d3Area<ChartPoint>()
      .x((_, index) => xScale(index))
      .y0(innerHeight)
      .y1((point) => yScale(point.value))
      .curve(curveMonotoneX)

    return {
      linePath: makeLine(data) ?? '',
      areaPath: makeArea(data) ?? '',
      ticks: yScale.ticks(4),
      y: yScale,
      x: xScale,
    }
  }, [data, inner, innerHeight])

  const gradientId = useId()

  return (
    <figure className="nav-chart">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{summarize(data, label, format)}</title>
        {filled ? (
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(series)} stopOpacity="0.8" />
              <stop offset="100%" stopColor={seriesColor(series)} stopOpacity="0.1" />
            </linearGradient>
          </defs>
        ) : null}
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <Gridlines ticks={ticks} scale={y} inner={inner} />
          <ValueAxis ticks={ticks} scale={y} format={format} />
          {filled ? <path className="nav-chart__area" d={areaPath} fill={`url(#${gradientId})`} /> : null}
          {/* Drawn after the fill so the stroke sits on top of it. No point
              markers: on a monotone curve a dot per point is noise, and the
              summary in the title already states where the series ends. */}
          <path className="nav-chart__line" d={linePath} stroke={seriesColor(series)} fill="none" />
          {data.map((point, index) => (
            <text
              key={point.label}
              className="nav-chart__tick"
              x={x(index)}
              y={innerHeight + 18}
              textAnchor="middle"
              aria-hidden="true"
            >
              {point.label}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  )
}

/** A trend line. Use where the interesting range does not include zero. */
export function LineChart(props: ChartProps) {
  return <Trend {...props} filled={false} />
}

/** A trend line with the area under it filled. */
export function AreaChart(props: ChartProps) {
  return <Trend {...props} filled />
}

/* ----------------------------------------------------------------- legend -- */

export interface ChartLegendProps {
  entries: { label: ReactNode; series: number }[]
}

export function ChartLegend({ entries }: ChartLegendProps) {
  return (
    <ul className="nav-chart-legend">
      {entries.map((entry, index) => (
        /* eslint-disable-next-line react/no-array-index-key */
        <li className="nav-chart-legend__entry" key={index}>
          <span
            className="nav-chart-legend__swatch"
            style={{ background: seriesColor(entry.series) }}
            aria-hidden="true"
          />
          {entry.label}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------- pie -- */

export interface PieChartProps {
  data: ChartPoint[]
  label: string
  height?: number
  format?: (value: number) => string
  /**
   * Hole as a fraction of the radius. `0` is a pie; `0.6` is a donut. The
   * bar chart starts at zero for the same reason this default does: a hole
   * is a choice, not the type.
   */
  innerRadius?: number
}

/** Radians between donut slices, and the rounding at each slice's corners. */
const DONUT_PAD_ANGLE = 0.02
const DONUT_CORNER_RADIUS = 4

function summarizePie(data: ChartPoint[], label: string, format: (value: number) => string): string {
  const slices = data.filter((point) => point.value > 0)
  if (slices.length === 0) return `${label}: no data`
  const total = slices.reduce((sum, point) => sum + point.value, 0)
  const largest = slices.reduce((best, point) => (point.value > best.value ? point : best))
  const share = total === 0 ? 0 : Math.round((largest.value / total) * 100)
  return `${label}. ${slices.length} slices totaling ${format(total)}. Largest is ${largest.label} at ${format(largest.value)} (${share}%).`
}

/**
 * A pie (or donut) of categories.
 *
 * Each slice takes the next `--nav-chart-*` token, wrapping at six — the same
 * palette as the bar chart, so a brief that shows both reads as one system.
 * Labels live in `ChartLegend`; a label on a thin slice is a label nobody
 * can read.
 */
export function PieChart({
  data,
  label,
  height = 260,
  format = String,
  innerRadius = 0,
}: PieChartProps) {
  const titleId = useId()
  const radius = Math.min(WIDTH, height) / 2 - 8
  const hole = Math.max(0, Math.min(0.85, innerRadius)) * radius

  const slices = useMemo(() => {
    const values = data.filter((point) => point.value > 0)
    // A donut separates its slices with a gap and rounds their ends; a solid
    // pie keeps the surface-colored seam, because a gap there converges to a
    // point at the center and a rounded corner has nowhere to go.
    const pie = d3Pie<ChartPoint>()
      .value((point) => point.value)
      .sort(null)
      .padAngle(hole > 0 ? DONUT_PAD_ANGLE : 0)
    const arc = d3Arc<PieArcDatum<ChartPoint>>()
      .innerRadius(hole)
      .outerRadius(radius)
      .cornerRadius(hole > 0 ? DONUT_CORNER_RADIUS : 0)
    return pie(values).map((datum, index) => ({
      datum,
      path: arc(datum) ?? '',
      series: index,
    }))
  }, [data, hole, radius])

  return (
    <figure className="nav-chart nav-chart--pie">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{summarizePie(data, label, format)}</title>
        <g transform={`translate(${WIDTH / 2},${height / 2})`}>
          {slices.map(({ datum, path, series }) => (
            <path
              key={datum.data.label}
              className="nav-chart__slice"
              d={path}
              fill={seriesColor(series)}
            >
              <title>
                {datum.data.label}: {format(datum.data.value)}
              </title>
            </path>
          ))}
        </g>
      </svg>
      <ChartLegend entries={slices.map(({ datum, series }) => ({ label: datum.data.label, series }))} />
    </figure>
  )
}
