import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeSentence, fakeTitle, fakeWords } from '../../fixtures/fake.mjs'
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

const W = (key: string) => fakeWords(`notation/list/${key}`, 5)

/** The list items of a one-section notation, as type, source number, and text. */
function listItems(source: string) {
  return (parseNotation(source)[0]?.blocks ?? []).map(({ type, number, text }) => ({ type, number, text }))
}

describe('parseNotation lists', () => {
  it('joins an indented continuation to its ordered item, so the list stays one list', () => {
    const source = [
      `1. ${W('one')} and`,
      `   ${W('one-wrap')};`,
      `2. ${W('two')};`,
      `3. ${W('three')}`,
      `   ${W('three-wrap')};`,
      `4. ${W('four')}.`,
    ].join('\n')
    expect(listItems(source)).toEqual([
      { type: 'ordered-list-item', number: 1, text: `${W('one')} and ${W('one-wrap')};` },
      { type: 'ordered-list-item', number: 2, text: `${W('two')};` },
      { type: 'ordered-list-item', number: 3, text: `${W('three')} ${W('three-wrap')};` },
      { type: 'ordered-list-item', number: 4, text: `${W('four')}.` },
    ])

    render(<HarvardOutlineViewer sections={parseNotation(source)} />)
    const lists = document.querySelectorAll('ol.harvard-outline__list')
    expect(lists).toHaveLength(1)
    expect(lists[0]!.querySelectorAll('li')).toHaveLength(4)
    expect(lists[0]).not.toHaveAttribute('start')
  })

  it('joins a lazy continuation line, the way CommonMark does', () => {
    expect(listItems(`1. ${W('lazy')}\n${W('lazy-wrap')}\n2. ${W('after')}`)).toEqual([
      { type: 'ordered-list-item', number: 1, text: `${W('lazy')} ${W('lazy-wrap')}` },
      { type: 'ordered-list-item', number: 2, text: W('after') },
    ])
  })

  it('joins wrapped lines of bulleted items, indented or lazy', () => {
    expect(listItems(`- ${W('b-one')}\n  ${W('b-one-wrap')}\n* ${W('b-two')}\n${W('b-two-wrap')}`)).toEqual([
      { type: 'list-item', number: undefined, text: `${W('b-one')} ${W('b-one-wrap')}` },
      { type: 'list-item', number: undefined, text: `${W('b-two')} ${W('b-two-wrap')}` },
    ])
  })

  it('keeps an indented paragraph after a blank line in its item, and ends the list at an unindented one', () => {
    expect(listItems(`1. ${W('p-one')}\n\n   ${W('p-more')}\n2. ${W('p-two')}\n\n${W('p-after')}`)).toEqual([
      { type: 'ordered-list-item', number: 1, text: `${W('p-one')} ${W('p-more')}` },
      { type: 'ordered-list-item', number: 2, text: W('p-two') },
      { type: 'paragraph', number: undefined, text: W('p-after') },
    ])
  })

  it('does not swallow a hold or a quotation that follows an item', () => {
    expect(listItems(`1. ${W('h-one')}\n[${W('h-hold')}]\n> ${W('h-quote')}`).map(({ type }) => type)).toEqual([
      'ordered-list-item',
      'hold',
      'quotation',
    ])
  })

  it('numbers a list that resumes after an interruption from its own first item', () => {
    const source = `1. ${W('r-one')}\n2. ${W('r-two')}\n\n${W('r-between')}\n\n3. ${W('r-three')}\n4. ${W('r-four')}`
    render(<HarvardOutlineViewer sections={parseNotation(source)} />)
    const lists = document.querySelectorAll('ol.harvard-outline__list')
    expect(lists).toHaveLength(2)
    expect(lists[0]).not.toHaveAttribute('start')
    expect(lists[1]).toHaveAttribute('start', '3')
    expect(lists[1]!.querySelectorAll('li')).toHaveLength(2)
  })

  describe('the last item of a list', () => {
    const LAST = W('last')
    const lastOf = (blocks: { type: string; text: string }[] | undefined) => {
      const items = (blocks ?? []).filter((block) => block.type === 'ordered-list-item')
      return { count: items.length, last: items[items.length - 1]?.text }
    }

    it('is kept when the list ends the document, with or without a trailing newline', () => {
      for (const end of ['', '\n', '\n\n']) {
        const source = `I. ${SECTION_TITLE}\n\n1. ${W('first')}\n2. ${LAST}${end}`
        expect(lastOf(parseNotation(source)[0]?.blocks)).toEqual({ count: 2, last: LAST })
      }
    })

    it('is kept whole when it wraps', () => {
      const source = `1. ${W('first')}\n2. ${LAST}\n   ${W('last-wrap')}`
      expect(lastOf(parseNotation(source)[0]?.blocks)).toEqual({ count: 2, last: `${LAST} ${W('last-wrap')}` })
    })

    it('stays in its own section when the list ends the section', () => {
      const sections = parseNotation(`I. ${SECTION_TITLE}\n\n1. ${W('first')}\n2. ${LAST}\n\nII. ${NESTED_TITLE}\n\n${BODY}`)
      expect(lastOf(sections[0]?.blocks)).toEqual({ count: 2, last: LAST })
      expect(sections[1]?.blocks?.map(({ type, text }) => ({ type, text }))).toEqual([{ type: 'paragraph', text: BODY }])
    })

    it('is flushed into its section when a heading follows it directly', () => {
      for (const next of [`## II. ${NESTED_TITLE}`, `II. ${NESTED_TITLE}`]) {
        const { sections } = parseNotationDocument(`## I. ${SECTION_TITLE}\n\n1. ${W('first')}\n2. ${LAST}\n   ${W('last-wrap')}\n${next}\n\n${BODY}`)
        expect(lastOf(sections[0]?.blocks)).toEqual({ count: 2, last: `${LAST} ${W('last-wrap')}` })
        expect(sections[1]).toMatchObject({ id: 'section-ii', title: NESTED_TITLE })
        expect(sections[1]?.blocks?.[0]?.text).toBe(BODY)
      }
    })
  })
})

/** Each unit as `path` → title (undefined when untitled), depth first. */
function outlineOf(source: string) {
  const walk = (sections: ReturnType<typeof parseNotation>, parent = ''): [string, string | undefined][] =>
    sections.flatMap((section) => {
      const path = parent ? `${parent}.${section.marker}` : section.marker
      return [[path, section.title] as [string, string | undefined], ...walk(section.sections ?? [], path)]
    })
  return walk(parseNotationDocument(source).sections)
}

describe('marker-only headings', () => {
  it('reads a bare marker the same with or without its period, for every marker type', () => {
    for (const marker of ['I', 'IV', 'A', '1', '12', 'a']) {
      const bare = parseNotationDocument(`## ${marker}\n\n${BODY}`).sections[0]
      const dotted = parseNotationDocument(`## ${marker}.\n\n${BODY}`).sections[0]
      expect(bare).toEqual(dotted)
      expect(bare).toMatchObject({ marker, blocks: [{ text: BODY }] })
      expect(bare?.title).toBeUndefined()
    }
  })

  it('leaves an ordinary one-word heading alone', () => {
    // An unmarked heading takes its depth from its `#` level, as it always has.
    expect(outlineOf(`## I. ${SECTION_TITLE}\n\n${BODY}\n\n## Signatures\n\n${BODY}\n\n## Notes`)).toEqual([
      ['I', SECTION_TITLE],
      ['I.•', 'Signatures'],
      ['I.•', 'Notes'],
    ])
  })

  it('nests a Roman-numbered reply as I → I.A, IV', () => {
    const source = ['## I', BODY, '### A', BODY, '### B', BODY, '## II', BODY, '## IV. Governing Law', BODY].join('\n\n')
    expect(outlineOf(source)).toEqual([
      ['I', undefined],
      ['I.A', undefined],
      ['I.B', undefined],
      ['II', undefined],
      ['IV', 'Governing Law'],
    ])
    expect(parseNotationDocument(source).sections.map((section) => section.id)).toEqual([
      'section-i',
      'section-ii',
      'section-iv',
    ])
  })

  it('reads a Roman-looking capital as a subsection when it follows the letter before it', () => {
    const source = ['## III', '### A', '### B', '### C', '### D', '## IV. Governing Law'].join('\n\n')
    expect(outlineOf(source)).toEqual([
      ['III', undefined],
      ['III.A', undefined],
      ['III.B', undefined],
      ['III.C', undefined],
      ['III.D', undefined],
      ['IV', 'Governing Law'],
    ])
  })

  it('runs subsections A through M without breaking at a Roman letter', () => {
    const letters = 'ABCDEFGHIJKLM'.split('')
    const source = ['## I', ...letters.map((letter) => `### ${letter}`)].join('\n\n')
    expect(outlineOf(source)).toEqual([['I', undefined], ...letters.map((letter) => [`I.${letter}`, undefined])])
  })

  it('keeps a Roman numeral at the top level when no letter precedes it', () => {
    expect(outlineOf(['## I', '## II', '## V', '## X'].join('\n\n')).map(([path]) => path)).toEqual([
      'I',
      'II',
      'V',
      'X',
    ])
    // V after a section's subsections A–D is still the next Roman section.
    const after = ['## IV', '### A', '### B', '### C', '### D', '## V'].join('\n\n')
    expect(outlineOf(after).map(([path]) => path)).toEqual(['IV', 'IV.A', 'IV.B', 'IV.C', 'IV.D', 'V'])
  })

  it('reads I after H as a capital, with or without a period', () => {
    for (const end of ['', '.']) {
      const source = ['## I', '### G', '### H', `### I${end}`, '## II'].join('\n\n')
      expect(outlineOf(source).map(([path]) => path)).toEqual(['I', 'I.G', 'I.H', 'I.I', 'II'])
    }
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
  it('tracks the page, jumps in the page, and scrolls the current rail item locally', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    const user = userEvent.setup()
    render(<HarvardOutlineViewer sections={parseNotation(notation())} scrollMode="page" />)

    const viewer = document.querySelector('.harvard-outline')
    const nav = screen.getByRole('navigation', { name: 'Harvard outline' })
    const nextButton = screen.getByRole('button', { name: new RegExp(NESTED_TITLE) })
    const nextItem = document.querySelector(`[data-harvard-id="${sectionSlug(NESTED_TITLE)}"]`)
    expect(viewer).toHaveClass('harvard-outline--page-scroll')

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

    // The page scrolls back: the first unit's top has reached the viewport's,
    // the nested one is still below it.
    const firstItem = document.querySelector(`[data-harvard-id="${sectionSlug(SECTION_TITLE)}"]`)!
    const doc = document.querySelector('.harvard-outline__doc')!
    vi.spyOn(doc, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: -20, width: 100, height: 800 }))
    vi.spyOn(firstItem, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: -20, width: 100, height: 300 }))
    vi.spyOn(nextItem!, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: 280, width: 100, height: 300 }))
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(document.querySelector('.harvard-outline__unit--current')).toBe(firstItem)
    vi.unstubAllGlobals()
  })

  it('leaves a controlled active id to its owner across a rerender', () => {
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

    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute('data-harvard-id', nextId)
    expect(onActiveIdChange).not.toHaveBeenCalled()
  })
})
