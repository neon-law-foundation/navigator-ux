import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeSentence, fakeTitle } from '../../fixtures/fake.mjs'
import { HarvardOutlineViewer } from '../components/HarvardOutline'
import { NotationViewer } from '../components/NotationViewer'
import { deriveNotationChecklist, parseNotation, parseNotationDocument } from '../lib/notation'

const SECTION_TITLE = fakeTitle('notation/section')
const NESTED_TITLE = fakeTitle('notation/nested-section')
const BODY = fakeSentence('notation/body')
const LIST_ITEM = fakeSentence('notation/list-item')
const HOLD_LABEL = fakeTitle('notation/hold-label').toUpperCase()
const HOLD_DETAIL = fakeSentence('notation/hold-detail')
const BLANK_LEAD = fakeTitle('notation/blank-lead')
const BLANK_LABEL = fakeTitle('notation/blank-label').toUpperCase()

function notation() {
  return [
    `I. ${SECTION_TITLE}`,
    BODY,
    `1. ${LIST_ITEM}`,
    `[${HOLD_LABEL} — ${HOLD_DETAIL}]`,
    `${BLANK_LEAD}: [${BLANK_LABEL}]`,
    `A. ${NESTED_TITLE}`,
    `[resolved. ${fakeSentence('notation/resolved-hold')}]`,
  ].join('\n\n')
}

function sectionSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

describe('parseNotation', () => {
  it('creates nested outline sections and typed blocks with stable ids and emphasis runs', () => {
    const [section] = parseNotation(notation())

    expect(section).toMatchObject({ marker: 'I', title: SECTION_TITLE })
    expect(section?.id).toBe(sectionSlug(SECTION_TITLE))
    expect(section?.blocks?.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: `${sectionSlug(SECTION_TITLE)}-1`, type: 'paragraph' },
      { id: `${sectionSlug(SECTION_TITLE)}-2`, type: 'ordered-list-item' },
      { id: `${sectionSlug(SECTION_TITLE)}-3`, type: 'hold' },
      { id: `${sectionSlug(SECTION_TITLE)}-4`, type: 'paragraph' },
    ])
    expect(section?.blocks?.[0]?.text).toBe(BODY)
    expect(section?.blocks?.[2]?.text).toBe(`${HOLD_LABEL} — ${HOLD_DETAIL}`)
    expect(section?.blocks?.[3]?.runs).toEqual([
      { id: `${sectionSlug(SECTION_TITLE)}-4-run-0`, type: 'text', text: `${BLANK_LEAD}: ` },
      { id: `${sectionSlug(SECTION_TITLE)}-4-run-${BLANK_LEAD.length + 2}`, type: 'emphasis', text: BLANK_LABEL },
    ])
    expect(section?.sections?.[0]).toMatchObject({
      marker: 'A',
      title: NESTED_TITLE,
      blocks: [{ id: `${sectionSlug(NESTED_TITLE)}-1`, type: 'hold' }],
    })
  })

  it('keeps ids unique when headings repeat and supplies a section for an unheaded body', () => {
    const repeated = parseNotation(`I. ${SECTION_TITLE}\n\n${BODY}\n\nII. ${SECTION_TITLE}`)
    expect(repeated.map(({ id }) => id)).toEqual([
      sectionSlug(SECTION_TITLE),
      `${sectionSlug(SECTION_TITLE)}-2`,
    ])
    expect(parseNotation(BODY)[0]).toMatchObject({
      marker: 'I',
      title: 'Notation',
      blocks: [{ id: 'notation-1', text: BODY }],
    })
  })

  it('supports Markdown heading levels, numbered list items, and multiple inline blanks', () => {
    const title = fakeTitle('notation/markdown-title')
    const nested = fakeTitle('notation/numbered-subsection')
    const prose = fakeSentence('notation/multiple-blanks')
    const firstBlank = fakeTitle('notation/first-blank')
    const secondBlank = fakeTitle('notation/second-blank')
    const [section] = parseNotation(
      `# ${title}\n\n${prose} [${firstBlank}] ${prose} [${secondBlank}].\n\n### 1. ${nested}`,
    )

    expect(section).toMatchObject({ marker: '•', title })
    expect(section?.blocks?.[0]?.runs.map(({ type }) => type)).toEqual([
      'text', 'emphasis', 'text', 'emphasis', 'text',
    ])
    expect(section?.sections?.[0]).toMatchObject({ marker: '1', title: nested })
  })

  it('falls back to a generic slug for headings without slug characters', () => {
    expect(parseNotation('# !!!')[0]?.id).toBe('section')
  })

  it('parses a frontmatter-free document with numeral anchors and open terms', () => {
    const parsed = parseNotationDocument(`---\nkind: agreement\n---\n# Template title\n\nPreamble text for {{effective date}}.\n\n> Quoted preamble.\n\n## I. Repeated heading\n\nFirst {{effective date}}.\n\n## A. Nested heading\n\n### 1. Repeated heading\n\n1. First item\n2. Second item\n\n## II. Repeated heading\n\n> Quoted section.`)

    expect(parsed.title).toBe('Template title')
    expect(parsed.preamble.map(({ type }) => type)).toEqual(['paragraph', 'quotation'])
    expect(parsed.sections.map(({ id }) => id)).toEqual(['section-i', 'section-ii'])
    expect(parsed.sections[0]?.sections?.[0]).toMatchObject({
      id: 'section-i-a',
      sections: [{ id: 'section-i-a-1', title: 'Repeated heading' }],
    })
    expect(parsed.sections[0]?.sections?.[0]?.sections?.[0]?.blocks?.map(({ type }) => type)).toEqual([
      'ordered-list-item', 'ordered-list-item',
    ])
    expect(parsed.sections[0]?.blocks?.[0]?.runs).toContainEqual(
      expect.objectContaining({ type: 'open-term', text: 'effective date' }),
    )
    expect(parsed.openTerms).toEqual([{ id: 'open-term-effective-date', label: 'effective date' }])
  })

  it('handles a body without frontmatter or sections, including unordered items and consecutive quotes', () => {
    const parsed = parseNotationDocument('')
    const [section] = parseNotation(`I. ${SECTION_TITLE}\n\n> First quote\n> Second quote\n\n- An unordered item`)

    expect(parsed).toEqual({ title: '', preamble: [], sections: [], openTerms: [] })
    expect(section?.blocks?.map(({ type }) => type)).toEqual(['quotation', 'list-item'])
    expect(section?.blocks?.[0]?.text).toBe('First quote Second quote')
  })
})

describe('NotationViewer', () => {
  it('renders an empty outline when the source has no title, terms, or sections', () => {
    render(<NotationViewer source="" hrefForId={(id) => `#${id}`} />)
    expect(screen.getByText('This outline has no sections yet.')).toBeInTheDocument()
  })

  it('renders Contents links, preamble, quotations, ordered lists, and labelled open terms', () => {
    const hrefForId = (id: string) => `/portal/agreements/current#${id}`
    const source = `---\nkind: agreement\n---\n# Template title\n\nPreamble for {{governing law}}.\n\n> Preamble quotation.\n\n## I. First heading\n\n1. First numbered item\n2. Second numbered item\n\n## II. First heading\n\nTerms include {{governing law}}.`

    render(<NotationViewer source={source} hrefForId={hrefForId} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Template title' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Contents' })).toBeInTheDocument()
    const contentsLinks = screen.getByRole('navigation', { name: 'Contents' }).querySelectorAll('a')
    expect(contentsLinks[0]).toHaveAttribute('href', '/portal/agreements/current#section-i')
    expect(contentsLinks[1]).toHaveAttribute('href', '/portal/agreements/current#section-ii')
    expect(screen.getByText('Preamble quotation.').closest('blockquote')).toBeInTheDocument()
    expect(screen.getByText('First numbered item').closest('ol')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Open terms' })).toHaveTextContent('governing law to be agreed')
    expect(screen.getAllByText('governing law: to be agreed')).toHaveLength(2)
    expect(screen.queryByText('kind: agreement')).not.toBeInTheDocument()
  })
})

describe('deriveNotationChecklist', () => {
  it('turns labelled holds, resolved holds, and blanks into ordered review steps', () => {
    const steps = deriveNotationChecklist(parseNotation(notation()))

    expect(steps).toHaveLength(3)
    expect(steps[0]).toMatchObject({
      sourceId: `${sectionSlug(SECTION_TITLE)}-3`,
      title: HOLD_LABEL.charAt(0) + HOLD_LABEL.slice(1).toLowerCase(),
      detail: HOLD_DETAIL,
      checked: false,
    })
    expect(steps[1]).toMatchObject({
      sourceId: `${sectionSlug(SECTION_TITLE)}-4`,
      title: BLANK_LEAD,
      checked: false,
    })
    expect(steps[2]).toMatchObject({
      sourceId: `${sectionSlug(NESTED_TITLE)}-1`,
      title: expect.stringMatching(/^Resolved\./),
      checked: true,
    })
  })

  it('uses an unlabelled hold sentence and the blank token when no lead-in exists', () => {
    const hold = fakeSentence('notation/unlabelled-hold')
    const blank = fakeTitle('notation/standalone-blank').toUpperCase()
    const steps = deriveNotationChecklist(parseNotation(`I. ${SECTION_TITLE}\n\n[${hold}]\n\n[${blank}]`))

    expect(steps[0]?.title).toBe(hold)
    expect(steps[1]?.title).toBe(blank.charAt(0) + blank.slice(1).toLowerCase())
  })

  it('handles empty blanks and unpunctuated holds without inventing detail', () => {
    const steps = deriveNotationChecklist(
      parseNotation(`I. ${SECTION_TITLE}\n\n[${fakeTitle('notation/short-hold')}]\n\n[ blank ]`),
    )
    expect(steps).toHaveLength(2)
    expect(steps[0]?.detail).toBeUndefined()
    expect(steps[1]?.title).toBe('Complete this blank')
    expect(deriveNotationChecklist([])).toEqual([])
    expect(deriveNotationChecklist([{ id: SECTION_TITLE, marker: 'I', title: NESTED_TITLE }])).toEqual([])
  })
})

describe('HarvardOutlineViewer with parsed notation', () => {
  it('uses page observation, jumps in the page, and scrolls the current rail item locally', async () => {
    let observerOptions: IntersectionObserverInit | undefined
    let observerCallback: IntersectionObserverCallback | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        disconnect = vi.fn()
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observerCallback = callback
          observerOptions = options
        }
      },
    )
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    const user = userEvent.setup()
    render(<HarvardOutlineViewer sections={parseNotation(notation())} scrollMode="page" />)

    const viewer = document.querySelector('.harvard-outline')
    const nav = screen.getByRole('navigation', { name: 'Harvard outline' })
    const nextButton = screen.getByRole('button', { name: new RegExp(NESTED_TITLE) })
    const nextItem = document.querySelector(`[data-harvard-id="${sectionSlug(NESTED_TITLE)}"]`)
    expect(viewer).toHaveClass('harvard-outline--page-scroll')
    expect(observerOptions?.root).toBeNull()
    expect(observerCallback).toBeTypeOf('function')

    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    vi.spyOn(nextButton, 'getBoundingClientRect').mockReturnValue({
      top: 130,
      bottom: 160,
      left: 0,
      right: 100,
      width: 100,
      height: 30,
      x: 0,
      y: 130,
      toJSON: () => ({}),
    })
    await user.click(nextButton)

    expect(nav.scrollTop).toBe(60)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(nextItem).toBeInTheDocument()
    expect(scrollIntoView.mock.contexts[0]).toBe(nextItem)

    act(() => {
      observerCallback?.(
        [{
          isIntersecting: true,
          boundingClientRect: { top: 20 },
          target: nextItem as Element,
        } as unknown as IntersectionObserverEntry,
        {
          isIntersecting: true,
          boundingClientRect: { top: 40 },
          target: document.querySelector(`[data-harvard-id="${sectionSlug(SECTION_TITLE)}"]`) as Element,
        } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(document.querySelector('.harvard-outline__unit--current')).toBe(nextItem)
  })

  it('keeps the viewport observer when a controlled active id changes', () => {
    let observerCount = 0
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        disconnect = vi.fn()
        constructor() {
          observerCount += 1
        }
      },
    )
    const sections = parseNotation(notation())
    const firstId = sections[0]!.id
    const nextId = sections[0]!.sections![0]!.id
    const onActiveIdChange = vi.fn()
    const { rerender } = render(
      <HarvardOutlineViewer
        sections={sections}
        scrollMode="page"
        activeId={firstId}
        onActiveIdChange={onActiveIdChange}
      />,
    )

    rerender(
      <HarvardOutlineViewer
        sections={sections}
        scrollMode="page"
        activeId={nextId}
        onActiveIdChange={onActiveIdChange}
      />,
    )

    expect(observerCount).toBe(1)
  })
})
