import { describe, expect, it, vi } from 'vitest'

import {
  AXE_RUN_OPTIONS,
  AXE_WCAG_TAGS,
  auditWithAxe,
  axeReport,
  axeReportPasses,
  describeAxeNode,
  describeAxeResult,
  formatAxeReport,
  undecidableContrastFailures,
  type AxeInPage,
} from '../testing'

/** A `color-contrast` result axe declined to decide, with `data` on its one node. */
function contrastIncomplete(data: Record<string, unknown>) {
  return [
    {
      id: 'color-contrast',
      impact: 'serious' as const,
      help: 'Elements must meet minimum color contrast ratio thresholds',
      nodes: [{ target: ['.subject'], any: [{ id: 'color-contrast', data }] }],
    },
  ] as unknown as Parameters<typeof undecidableContrastFailures>[0]
}

describe('the axe policy', () => {
  it('audits WCAG 2.0 and 2.1, levels A and AA, by tag', () => {
    expect(AXE_WCAG_TAGS).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    expect(AXE_RUN_OPTIONS.runOnly).toEqual({ type: 'tag', values: [...AXE_WCAG_TAGS] })
  })

  /*
   * Both shapes are `color-contrast` results axe declined to decide, and the
   * whole value of the policy is that it treats them differently.
   */
  it('separates the undecidable from the unmeasurable', () => {
    // Text over a photograph: axe names why it could not decide. Reported only.
    const overImage = contrastIncomplete({ fgColor: '#ffffff', bgColor: null, messageKey: 'bgImage' })
    expect(undecidableContrastFailures(overImage)).toEqual([])

    // No opaque background anywhere, and no reason: a defect.
    const unmeasurable = contrastIncomplete({ fgColor: '#ffffff', bgColor: null, messageKey: null })
    expect(undecidableContrastFailures(unmeasurable)).toEqual(['.subject (fg #ffffff, bg none, reason undetermined)'])

    // A resolved background is not the shape either.
    expect(undecidableContrastFailures(contrastIncomplete({ fgColor: '#000000', bgColor: '#ffffff' }))).toEqual([])
  })

  it('ignores incomplete results that are not contrast checks', () => {
    const other = [
      { id: 'aria-prohibited-attr', help: 'x', nodes: [{ target: ['footer'], any: [] }] },
      { id: 'color-contrast', help: 'y', nodes: [{ target: ['p'], any: [{ id: 'other-check', data: {} }] }] },
    ] as unknown as Parameters<typeof undecidableContrastFailures>[0]
    expect(undecidableContrastFailures(other)).toEqual([])
  })

  it('describes a result by impact, rule, help, and every node, with colors for a contrast node', () => {
    expect(
      describeAxeResult({
        id: 'image-alt',
        impact: 'critical',
        help: 'Images must have alternate text',
        nodes: [{ target: ['main', 'img'] }, { target: ['#seal'] }],
      }),
    ).toBe('[critical] image-alt: Images must have alternate text — at main img; #seal')
    expect(describeAxeResult({ id: 'x', help: 'Help', nodes: [{}] })).toBe('[unknown] x: Help — at ')
    expect(
      describeAxeNode({
        target: ['.lede'],
        any: [{ id: 'color-contrast', data: { fgColor: '#777777', bgColor: '#ffffff', messageKey: 'bgGradient' } }],
      } as unknown as Parameters<typeof describeAxeNode>[0]),
    ).toBe('.lede (fg #777777, bg #ffffff, reason bgGradient)')
    expect(
      describeAxeNode({ target: ['.bare'], any: [{ id: 'color-contrast' }] } as unknown as Parameters<typeof describeAxeNode>[0]),
    ).toBe('.bare (fg none, bg none, reason undetermined)')
  })

  it('fails on a violation or unmeasurable text, and only reports the rest', () => {
    const clean = axeReport({ violations: [], incomplete: contrastIncomplete({ bgColor: null, messageKey: 'bgImage' }) })
    expect(axeReportPasses(clean)).toBe(true)
    const quiet = formatAxeReport(clean, 'on /')
    expect(quiet.failure).toBeNull()
    expect(quiet.undecided).toMatch(/^axe could not decide 1 check\(s\) on \/:\n {2}\[serious\] color-contrast/)

    expect(formatAxeReport(axeReport({ violations: [] }), 'on /')).toEqual({ failure: null, undecided: null })

    const failing = axeReport({
      violations: [{ id: 'button-name', impact: 'critical', help: 'Buttons must have discernible text', nodes: [{ target: ['button'] }] }],
      incomplete: contrastIncomplete({ fgColor: '#ffffff', bgColor: null }),
    })
    expect(axeReportPasses(failing)).toBe(false)
    const { failure } = formatAxeReport(failing, 'within `html` on /components/all [dark]')
    expect(failure).toContain('axe found 1 WCAG A/AA violation(s) within `html` on /components/all [dark]:')
    expect(failure).toContain('  [critical] button-name: Buttons must have discernible text — at button')
    expect(failure).toContain('1 element(s) within `html` on /components/all [dark] carry text over no declared background')
    expect(failure).toContain('  .subject (fg #ffffff, bg none, reason undetermined)')

    expect(axeReportPasses(axeReport({ violations: [], incomplete: contrastIncomplete({ bgColor: null }) }))).toBe(false)
  })
})

describe('auditWithAxe', () => {
  it('runs the policy over the scope it is given', async () => {
    document.body.innerHTML = '<main><p>Hello</p></main>'
    const run = vi.fn<AxeInPage['run']>().mockResolvedValue({ violations: [], incomplete: [] } as never)
    const report = await auditWithAxe({ run }, document, 'main')
    expect(run).toHaveBeenCalledWith(document.querySelector('main'), AXE_RUN_OPTIONS)
    expect(report).toEqual({ violations: [], incomplete: [], undecidableContrast: [] })
    await auditWithAxe({ run }, document)
    expect(run).toHaveBeenLastCalledWith(document.documentElement, AXE_RUN_OPTIONS)
    document.body.innerHTML = ''
  })

  it('reports an audit that did not happen as a violation, never as a pass', async () => {
    const run = vi.fn<AxeInPage['run']>()
    const missing = await auditWithAxe({ run }, document, '#nowhere')
    expect(run).not.toHaveBeenCalled()
    expect(missing.violations).toEqual(['[serious] axe-scope-missing: no element matched #nowhere — at '])

    run.mockRejectedValue(new Error('boom'))
    const thrown = await auditWithAxe({ run }, document, 'body')
    expect(thrown.violations).toEqual(['[serious] axe-run-error: Error: boom — at '])
  })
})
