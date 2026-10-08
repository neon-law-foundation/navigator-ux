import { afterEach, describe, expect, it, vi } from 'vitest'

import { outlineInView, outlineStep, readerPlace } from '../lib/reader-place'

function outline(tops: number[], { margin }: { margin?: string } = {}) {
  const root = document.createElement('div')
  root.className = 'harvard-outline harvard-outline--page-scroll'
  tops.forEach((top, index) => {
    const unit = document.createElement('article')
    unit.id = `unit-${index + 1}`
    unit.dataset.harvardId = unit.id
    if (margin) unit.style.scrollMarginTop = margin
    vi.spyOn(unit, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: top, width: 400, height: 200 }))
    root.append(unit)
  })
  document.body.append(root)
  return root
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('readerPlace', () => {
  it('is before the first unit when there are none', () => {
    expect(readerPlace(outline([]))).toMatchObject({ units: [], current: -1, margin: 0 })
  })

  it('counts a unit resting at its scroll margin as reached, and one further down as not', () => {
    expect(readerPlace(outline([-300, 80, 400], { margin: '80px' })).current).toBe(1)
    expect(readerPlace(outline([-300, 80, 400])).current).toBe(0)
  })

  it('measures from a pane top when given one', () => {
    expect(readerPlace(outline([100, 300]), 300).current).toBe(1)
  })
})

describe('outlineStep', () => {
  it('has nowhere to step back to from the start of the first unit', () => {
    expect(outlineStep(outline([0, 300]), -1)).toBeNull()
  })

  it('returns to the start of the first unit from part-way through it', () => {
    const root = outline([-50, 300])
    expect(outlineStep(root, -1)).toBe(root.querySelector('#unit-1'))
  })
})

describe('outlineInView', () => {
  it('skips an outline with no box, inside a closed <details>, or off screen', () => {
    const hidden = outline([0])
    vi.spyOn(hidden, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: 0, width: 0, height: 0 }))

    const details = document.createElement('details')
    const closed = outline([0])
    details.append(closed)
    document.body.append(details)
    vi.spyOn(closed, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: 0, width: 400, height: 400 }))

    const below = outline([0])
    vi.spyOn(below, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ y: window.innerHeight + 1, width: 400, height: 400 }),
    )
    expect(outlineInView()).toBeNull()

    const shown = outline([0])
    vi.spyOn(shown, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: -100, width: 400, height: 400 }))
    expect(outlineInView()).toBe(shown)
  })
})
