import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

import { seriesColor } from '../lib/chart-series'

/*
 * GraphView — a record graph as a force-directed web.
 *
 * `d3-force` runs the physics and nothing else; it never touches the DOM. The
 * simulation owns the numbers, React owns the SVG, and the tick handler is the
 * only bridge between them. That split is what lets the graph be dragged,
 * filtered and re-rendered without the two libraries fighting over who holds
 * the element — d3 here is a math library that happens to ship beside a DOM one.
 *
 * The intended subject is a matter's record graph: parties, instruments, terms
 * and evidence, which is the shape a graph store already holds them in. Nodes
 * carry an arbitrary `fields` map so a reader can select one and read — or
 * edit, through `onFieldChange` — its record beside the picture. That pairing
 * is the point: a graph you can only look at makes you go somewhere else to
 * find out what a node actually says.
 *
 * Dragging is React pointer events rather than `d3-drag`, which would need
 * `d3-selection` and a second library taking hold of the same nodes React is
 * rendering. Pointer capture gives the same behavior in a dozen lines.
 */

export interface GraphNode {
  id: string
  label: string
  /** Groups nodes for color and for the filter. Free-form. */
  kind: string
  /** The record behind the node, shown in the panel and optionally editable. */
  fields?: Record<string, string>
}

export interface GraphEdge {
  source: string
  target: string
  /** Groups edges for stroke and for the filter. Free-form. */
  kind: string
  label?: string
}

export interface GraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Describes the graph. Required — the SVG is otherwise unnamed. */
  label: string
  height?: number
  /** Show the record panel beside the graph. */
  showPanel?: boolean
  /** Makes the panel's fields editable. Omit for a read-only graph. */
  onFieldChange?: (nodeId: string, field: string, value: string) => void
}

type SimNode = GraphNode & SimulationNodeDatum
type SimEdge = SimulationLinkDatum<SimNode> & { kind: string; label?: string }

interface ResolvedEdge extends SimEdge {
  source: SimNode
  target: SimNode
}

function isResolved(edge: SimEdge): edge is ResolvedEdge {
  return typeof edge.source === 'object' && typeof edge.target === 'object'
}

const WIDTH = 800
const RADIUS = 26

/*
 * Labels are drawn inside the node, so a long one runs past the circle.
 *
 * SVG has no text overflow — no ellipsis, no clipping without a clipPath — so
 * the truncation has to happen before the glyphs do. Eleven characters is what
 * fits at this radius and font size. The full label stays in the node's
 * `aria-label`, so nothing is lost to a reader who cannot see the picture.
 */
const LABEL_MAX = 11

function fitLabel(label: string): string {
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 1)}\u2026` : label
}

/** A stable series index per kind, so a kind keeps its color across renders. */
function kindIndex(kinds: string[], kind: string): number {
  return Math.max(0, kinds.indexOf(kind))
}

export function GraphView({
  nodes,
  edges,
  label,
  height = 460,
  showPanel = true,
  onFieldChange,
}: GraphViewProps) {
  const nodeKinds = useMemo(() => [...new Set(nodes.map((node) => node.kind))], [nodes])
  const edgeKinds = useMemo(() => [...new Set(edges.map((edge) => edge.kind))], [edges])

  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<string | null>(null)
  // Bumped by the tick handler. The simulation mutates node objects in place,
  // so this is what tells React that the numbers moved.
  const [, setFrame] = useState(0)

  const simRef = useRef<Simulation<SimNode, SimEdge> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const draggingRef = useRef<string | null>(null)

  const visibleNodes = useMemo(
    () => nodes.filter((node) => !hidden.has(node.kind)),
    [nodes, hidden],
  )
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes])
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [edges, visibleIds],
  )

  useEffect(() => {
    // Rebuild from the visible set. Positions are seeded from the previous run
    // where a node survives the filter, so toggling a kind nudges the layout
    // rather than throwing it away and re-scattering everything.
    const previous = new Map(nodesRef.current.map((node) => [node.id, node]))
    const simNodes: SimNode[] = visibleNodes.map((node) => {
      const prior = previous.get(node.id)
      return { ...node, x: prior?.x, y: prior?.y, vx: prior?.vx, vy: prior?.vy }
    })
    const simEdges: SimEdge[] = visibleEdges.map((edge) => ({ ...edge }))

    const simulation = forceSimulation<SimNode, SimEdge>(simNodes)
      .force('charge', forceManyBody().strength(-420))
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges)
          .id((node) => node.id)
          .distance(150),
      )
      .force('collide', forceCollide(RADIUS + 8))
      // forceCenter fights dragging — it translates every node to restore the
      // centroid, so a dragged node drags the whole graph with it. Weak x/y
      // pulls toward the middle hold the layout in frame without that.
      .force('x', forceX(WIDTH / 2).strength(0.05))
      .force('y', forceY(height / 2).strength(0.07))
      .on('tick', () => setFrame((frame) => frame + 1))

    simRef.current = simulation
    nodesRef.current = simNodes
    edgesRef.current = simEdges

    // Settle the layout before the first paint.
    //
    // `forceSimulation` starts an internal timer and emits its first tick on
    // the next animation frame, so a component that waits for it renders one
    // frame of every node stacked at the origin — and in a test environment
    // with no rAF, renders nothing at all. Ticking synchronously here gives a
    // laid-out graph immediately; the timer then keeps animating from there.
    simulation.tick(40)
    setFrame((frame) => frame + 1)

    return () => {
      simulation.stop()
    }
  }, [visibleNodes, visibleEdges, height])

  const onPointerDown = useCallback((event: PointerEvent<SVGGElement>, id: string) => {
    const node = nodesRef.current.find((candidate) => candidate.id === id)
    if (!node) return
    draggingRef.current = id
    // Not universally implemented — jsdom has no pointer capture at all, and
    // an unguarded call throws out of the handler and kills the drag before it
    // starts. Without it the drag still works; the pointer can just escape the
    // element mid-gesture.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    node.fx = node.x
    node.fy = node.y
    simRef.current?.alphaTarget(0.3).restart()
  }, [])

  const onPointerMove = useCallback((event: PointerEvent<SVGGElement>) => {
    const id = draggingRef.current
    if (!id) return
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    // Convert client pixels into viewBox units — the SVG scales with the
    // container, so a raw clientX would drift from the pointer as it resizes.
    const box = svg.getBoundingClientRect()
    const node = nodesRef.current.find((candidate) => candidate.id === id)
    if (!node) return
    node.fx = ((event.clientX - box.left) / box.width) * WIDTH
    node.fy = ((event.clientY - box.top) / box.height) * height
  }, [height])

  const onPointerUp = useCallback(() => {
    const id = draggingRef.current
    draggingRef.current = null
    if (!id) return
    const node = nodesRef.current.find((candidate) => candidate.id === id)
    if (node) {
      // Release the pin so the layout can settle around where it was dropped.
      node.fx = null
      node.fy = null
    }
    simRef.current?.alphaTarget(0)
  }, [])

  const toggleKind = useCallback((kind: string) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }, [])

  const selectedNode = nodes.find((node) => node.id === selected) ?? null

  return (
    <div className="nav-graph">
      <div className="nav-graph__filters" role="group" aria-label={`${label} filters`}>
        {nodeKinds.map((kind) => {
          const on = !hidden.has(kind)
          return (
            <button
              key={kind}
              type="button"
              className={on ? 'nav-graph__filter nav-graph__filter--on' : 'nav-graph__filter'}
              aria-pressed={on}
              onClick={() => toggleKind(kind)}
            >
              <span
                className="nav-graph__swatch"
                style={{ background: seriesColor(kindIndex(nodeKinds, kind)) }}
                aria-hidden="true"
              />
              {kind}
            </button>
          )
        })}
      </div>

      <div className="nav-graph__body">
        <svg
          className="nav-graph__canvas"
          viewBox={`0 0 ${WIDTH} ${height}`}
          // `group`, not `img`: an image's children are presentational, which
          // would hide every node button inside it from assistive technology.
          role="group"
          aria-label={`${label}. ${visibleNodes.length} nodes, ${visibleEdges.length} connections.`}
        >
          <g>
            {edgesRef.current.filter(isResolved).map((edge, index) => (
              <line
                /* eslint-disable-next-line react/no-array-index-key */
                key={index}
                className="nav-graph__edge"
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={seriesColor(kindIndex(edgeKinds, edge.kind))}
                strokeOpacity="0.45"
              />
            ))}
          </g>
          <g>
            {nodesRef.current.map((node) => (
              <g
                key={node.id}
                className={
                  selected === node.id ? 'nav-graph__node nav-graph__node--selected' : 'nav-graph__node'
                }
                transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                onPointerDown={(event) => onPointerDown(event, node.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClick={() => setSelected(node.id)}
                tabIndex={0}
                role="button"
                aria-pressed={selected === node.id}
                aria-label={`${node.label}, ${node.kind}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelected(node.id)
                  }
                }}
              >
                <circle r={RADIUS} fill={seriesColor(kindIndex(nodeKinds, node.kind))} />
                <text className="nav-graph__label" textAnchor="middle" dy="0.32em">
                  {fitLabel(node.label)}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {showPanel ? (
          <div className="nav-graph__panel">
            {selectedNode ? (
              <>
                <p className="nav-graph__panel-title">{selectedNode.label}</p>
                <p className="nav-graph__panel-kind">{selectedNode.kind}</p>
                <dl className="nav-graph__fields">
                  {Object.entries(selectedNode.fields ?? {}).map(([field, value]) => (
                    <div className="nav-graph__field" key={field}>
                      <dt>{field}</dt>
                      <dd>
                        {onFieldChange ? (
                          <input
                            className="nav-input nav-graph__input"
                            value={value}
                            aria-label={`${selectedNode.label} ${field}`}
                            onChange={(event) =>
                              onFieldChange(selectedNode.id, field, event.target.value)
                            }
                          />
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="nav-graph__panel-empty">Select a node to read its record.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
