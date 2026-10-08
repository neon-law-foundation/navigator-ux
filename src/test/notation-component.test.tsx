import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeSentence, fakeTitle } from '../../fixtures/fake.mjs'
import REPLY_DRAFT from '../../fixtures/notation/reply-draft.md?raw'
import SERVICES_AGREEMENT from '../../fixtures/notation/services-agreement.md?raw'
import { parseNotationDocument } from '../lib/notation'
import { Accordion } from '../components/Disclosure'
import type { HarvardOutlineSection } from '../components/HarvardOutline'
import { Notation } from '../components/Notation'
import { ShortcutHost, ShortcutProvider } from '../components/Shortcuts'
import { createShortcutRegistry } from '../lib/shortcuts'

const DOCUMENT = fakeTitle('notation-component/document')
const PREAMBLE = fakeSentence('notation-component/preamble')
const SECTION_ONE = fakeTitle('notation-component/section-one')
const SECTION_TWO = fakeTitle('notation-component/section-two')
const BODY = fakeSentence('notation-component/body')

const SOURCE = [
  `# ${DOCUMENT}`,
  '',
  PREAMBLE,
  '',
  `## I. ${SECTION_ONE}`,
  '',
  BODY,
  '',
  `## II. ${SECTION_TWO}`,
  '',
  `1. ${fakeSentence('notation-component/item')}`,
].join('\n')

const CLAUSES: HarvardOutlineSection[] = [
  { id: 'reply-1', marker: '1', children: <p>{fakeSentence('notation-component/clause-1')}</p> },
  {
    id: 'reply-2',
    marker: '2',
    children: <p>{fakeSentence('notation-component/clause-2')}</p>,
    sections: [
      { id: 'reply-2a', marker: 'a', children: <p>{fakeSentence('notation-component/clause-2a')}</p> },
      { id: 'reply-2b', marker: 'b', children: <p>{fakeSentence('notation-component/clause-2b')}</p> },
    ],
  },
  { id: 'reply-3', marker: '3', children: <p>{fakeSentence('notation-component/clause-3')}</p> },
]

const hrefForId = (id: string) => `#${id}`

function box(top: number, height = 200) {
  return DOMRect.fromRect({ y: top, width: 600, height })
}

/** Put the outline inside `root` on screen, its units at these viewport tops. */
function layOut(tops: Record<string, number>, root: ParentNode = document) {
  const outline = root.querySelector('.harvard-outline--page-scroll')!
  vi.spyOn(outline, 'getBoundingClientRect').mockReturnValue(box(-50, 2000))
  for (const [id, top] of Object.entries(tops)) {
    const unit = root.querySelector(`article[data-harvard-id="${id}"]`)!
    vi.spyOn(unit, 'getBoundingClientRect').mockReturnValue(box(top))
  }
}

function press(init: KeyboardEventInit & { key: string }, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

function withKeys(ui: React.ReactNode) {
  const registry = createShortcutRegistry()
  const view = render(
    <ShortcutProvider registry={registry}>
      <ShortcutHost />
      {ui}
    </ShortcutProvider>,
  )
  return { registry, ...view }
}

let scrolled: Element[]

beforeEach(() => {
  scrolled = []
  HTMLElement.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
    scrolled.push(this)
  })
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('Notation', () => {
  it('is one closed item named by its trigger, with no page heading of its own', () => {
    render(<Notation id="terms" trigger={DOCUMENT} source={SOURCE} hrefForId={hrefForId} />)
    const item = document.getElementById('terms')!
    expect(item.tagName).toBe('DETAILS')
    expect(item).not.toHaveAttribute('open')
    expect(document.querySelectorAll('details')).toHaveLength(1)
    expect(item.querySelector('summary')).toHaveTextContent(DOCUMENT)
    expect(document.querySelector('h1')).toBeNull()
  })

  it('names itself by the source title when no trigger is given', () => {
    render(<Notation id="services" source={SERVICES_AGREEMENT} hrefForId={hrefForId} />)
    expect(document.querySelector('#services > summary')).toHaveTextContent('Services Agreement')
  })

  it('hangs an uncaptioned clause on its marker and keeps a captioned one as a heading', () => {
    render(<Notation id="reply" source={REPLY_DRAFT} hrefForId={hrefForId} defaultOpen />)
    const clause = document.getElementById('section-1')!
    expect(clause.querySelector(':scope > .harvard-outline__heading')).toBeNull()
    expect(clause.querySelector(':scope > .harvard-outline__clause > .harvard-outline__marker')).toHaveTextContent('1.')
    expect(document.getElementById('section-1-a')).toHaveAttribute('data-depth', '2')
    expect(document.querySelector('#section-3 > .harvard-outline__heading')).toHaveTextContent('3. Governing Law')
    expect(document.querySelector('[data-harvard-nav-id="section-1-b"] .harvard-outline__label')).toHaveTextContent(
      /^The parties record any point they agree/,
    )
  })

  it('opens on first render when asked', () => {
    render(<Notation id="terms" trigger="Terms" source={SOURCE} hrefForId={hrefForId} defaultOpen />)
    expect(document.getElementById('terms')).toHaveAttribute('open')
  })

  it('parses a source, opening with its preamble and anchoring every unit', () => {
    render(
      <Notation id="terms" trigger="Terms" source={SOURCE} hrefForId={hrefForId} aria-label="Terms contents" />,
    )
    expect(screen.getByRole('navigation', { name: 'Terms contents', hidden: true })).toBeInTheDocument()
    expect(document.querySelector('.harvard-outline__intro')).toHaveTextContent(PREAMBLE)
    expect(document.querySelector('.harvard-outline--page-scroll')).not.toBeNull()
    expect(document.getElementById('section-i')).toHaveTextContent(SECTION_ONE)
    expect(document.getElementById('section-i-1')).toHaveTextContent(BODY)
    expect(document.querySelector('a[data-harvard-nav-id="section-ii"]')).toHaveAttribute('href', '#section-ii')
  })

  it('renders prebuilt sections and intro blocks the same way', () => {
    const intro = fakeSentence('notation-component/intro')
    render(
      <Notation
        id="reply"
        trigger="Reply draft"
        sections={CLAUSES}
        introBlocks={[{ id: 'reply-intro', type: 'paragraph', text: intro, runs: [{ id: 'r', type: 'text', text: intro }] }]}
        hrefForId={hrefForId}
      />,
    )
    expect(document.getElementById('reply-intro')).toHaveTextContent(intro)
    expect(document.querySelector('article[data-harvard-id="reply-2b"]')).toHaveAttribute('data-depth', '2')
    expect(screen.getByRole('navigation', { name: 'Contents', hidden: true })).toBeInTheDocument()
  })

  it('renders the after slot inside the item, after the outline', () => {
    render(
      <Notation
        id="reply"
        trigger="Reply draft"
        sections={CLAUSES}
        hrefForId={hrefForId}
        after={<p data-testid="signature">Signature block</p>}
      />,
    )
    const after = screen.getByTestId('signature')
    expect(document.getElementById('reply')).toContainElement(after)
    const outline = document.querySelector('.harvard-outline')!
    expect(outline.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens and scrolls to a unit the address names on load', () => {
    window.history.replaceState(null, '', '/#section-ii')
    render(<Notation id="terms" trigger="Terms" source={SOURCE} hrefForId={hrefForId} />)
    expect(document.getElementById('terms')).toHaveAttribute('open')
    expect(scrolled).toEqual([document.getElementById('section-ii')])
  })

  it('opens on a hash change to the item itself or to a block inside it', () => {
    render(<Notation id="terms" trigger="Terms" source={SOURCE} hrefForId={hrefForId} />)
    const item = document.getElementById('terms') as HTMLDetailsElement

    act(() => {
      window.history.replaceState(null, '', '/#terms')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(item.open).toBe(true)

    item.open = false
    act(() => {
      window.history.replaceState(null, '', '/#section-i-1')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(item.open).toBe(true)
    expect(scrolled.at(-1)).toBe(document.getElementById('section-i-1'))
  })
})

describe('the specimen notations', () => {
  const shape = (sections: ReturnType<typeof parseNotationDocument>['sections']): unknown[] =>
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.blocks?.filter((block) => block.type !== 'paragraph').length,
      sections: shape(section.sections ?? []),
    }))

  it('parses captioned Roman sections, keeping every wrapped list item whole', () => {
    const parsed = parseNotationDocument(SERVICES_AGREEMENT)
    expect(parsed.title).toBe('Services Agreement')
    expect(parsed.openTerms).toEqual([{ id: 'open-term-effective-date', label: 'Effective Date' }])
    expect(shape(parsed.sections)).toEqual([
      { id: 'section-i', title: 'Services', items: 4, sections: [] },
      { id: 'section-ii', title: 'Fees and Payment', items: 3, sections: [] },
      { id: 'section-iii', title: 'Confidentiality', items: 2, sections: [] },
      { id: 'section-iv', title: 'Term and Termination', items: 3, sections: [] },
    ])
    const last = parsed.sections[3]!.blocks!.at(-1)!
    expect(last).toMatchObject({ type: 'ordered-list-item', number: 3 })
    expect(last.text).toBe('sections III and IV survive the end of this agreement.')
    expect(parsed.sections[0]!.blocks![1]!.text).toBe(
      'The Provider assigns qualified personnel to each order form and keeps the Client informed of any change in the people assigned;',
    )
  })

  it('nests marker-only headings by their markers, beside a captioned clause of the same rank', () => {
    const parsed = parseNotationDocument(REPLY_DRAFT)
    expect(parsed.preamble.map((block) => block.text)).toEqual([
      'The responding party proposes the following clauses in reply.',
    ])
    expect(shape(parsed.sections)).toEqual([
      {
        id: 'section-1',
        title: undefined,
        items: 0,
        sections: [
          { id: 'section-1-a', title: undefined, items: 0, sections: [] },
          { id: 'section-1-b', title: undefined, items: 0, sections: [] },
          { id: 'section-1-c', title: undefined, items: 0, sections: [] },
        ],
      },
      { id: 'section-2', title: undefined, items: 0, sections: [] },
      { id: 'section-3', title: 'Governing Law', items: 0, sections: [] },
    ])
    expect(parsed.sections[0]!.sections![2]!.blocks![0]!.text).toBe(
      'A point the parties do not agree stays open and is carried to the next draft.',
    )
  })
})

describe('Accordion and the address', () => {
  it('opens every <details> around the target, including one outside the accordion', () => {
    window.history.replaceState(null, '', '/#inner-text')
    render(
      <details id="outer">
        <summary>Outer</summary>
        <Accordion
          items={[
            { id: 'first', trigger: 'First', children: <p>One</p> },
            { id: 'second', trigger: 'Second', children: <p id="inner-text">Two</p> },
          ]}
        />
      </details>,
    )
    expect(document.getElementById('outer')).toHaveAttribute('open')
    expect(document.getElementById('second')).toHaveAttribute('open')
    expect(document.getElementById('first')).not.toHaveAttribute('open')
  })

  it('leaves a fragment outside it, or naming nothing, alone', () => {
    render(
      <>
        <p id="elsewhere">Elsewhere</p>
        <Accordion items={[{ id: 'only', trigger: 'Only', children: <p>One</p> }]} />
      </>,
    )
    for (const hash of ['#elsewhere', '#missing', '']) {
      act(() => {
        window.history.replaceState(null, '', `/${hash}`)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
    }
    expect(document.getElementById('only')).not.toHaveAttribute('open')
    expect(scrolled).toEqual([])
  })

  it('stops listening when unmounted', () => {
    const { unmount } = render(<Accordion items={[{ id: 'only', trigger: 'Only', children: 'One' }]} />)
    unmount()
    act(() => {
      window.history.replaceState(null, '', '/#only')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(scrolled).toEqual([])
  })
})

describe('arrow keys through an open outline', () => {
  function openReply() {
    return withKeys(
      <Notation id="reply" trigger="Reply draft" sections={CLAUSES} hrefForId={hrefForId} defaultOpen />,
    )
  }

  it('steps to the next unit, scrolling instantly and replacing the address', () => {
    openReply()
    const pushState = vi.spyOn(window.history, 'pushState')
    layOut({ 'reply-1': 0, 'reply-2': 300, 'reply-2a': 500, 'reply-2b': 700, 'reply-3': 900 })

    const event = press({ key: 'ArrowDown' })
    expect(event.defaultPrevented).toBe(true)
    expect(scrolled).toEqual([document.getElementById('reply-2')])
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
    expect(window.location.hash).toBe('#reply-2')
    expect(pushState).not.toHaveBeenCalled()
  })

  it('steps from the reader’s place: the last unit whose top has reached the viewport', () => {
    openReply()
    layOut({ 'reply-1': -800, 'reply-2': -500, 'reply-2a': 2, 'reply-2b': 300, 'reply-3': 600 })
    press({ key: 'ArrowDown' })
    expect(scrolled.at(-1)).toBe(document.getElementById('reply-2b'))
    press({ key: 'ArrowUp' })
    expect(scrolled.at(-1)).toBe(document.getElementById('reply-2'))
  })

  it('steps back to the start of a unit the reader is part-way through', () => {
    openReply()
    layOut({ 'reply-1': -800, 'reply-2': -500, 'reply-2a': -60, 'reply-2b': 300, 'reply-3': 600 })
    press({ key: 'ArrowUp' })
    expect(scrolled.at(-1)).toBe(document.getElementById('reply-2a'))
  })

  it('falls through to the page past either end', () => {
    openReply()
    layOut({ 'reply-1': -1200, 'reply-2': -900, 'reply-2a': -600, 'reply-2b': -300, 'reply-3': 0 })
    expect(press({ key: 'ArrowDown' }).defaultPrevented).toBe(false)

    vi.restoreAllMocks()
    layOut({ 'reply-1': 100, 'reply-2': 400, 'reply-2a': 600, 'reply-2b': 800, 'reply-3': 1000 })
    expect(press({ key: 'ArrowUp' }).defaultPrevented).toBe(false)
    expect(scrolled).toEqual([])
  })

  it('does nothing with a modifier, in a field, on a control that owns the arrows, or once handled', () => {
    openReply()
    layOut({ 'reply-1': 0, 'reply-2': 300, 'reply-2a': 500, 'reply-2b': 700, 'reply-3': 900 })
    for (const modifier of ['shiftKey', 'altKey', 'ctrlKey', 'metaKey']) {
      expect(press({ key: 'ArrowDown', [modifier]: true }).defaultPrevented).toBe(false)
    }

    const field = document.createElement('input')
    const slider = document.createElement('div')
    slider.setAttribute('role', 'slider')
    document.body.append(field, slider)
    expect(press({ key: 'ArrowDown' }, field).defaultPrevented).toBe(false)
    expect(press({ key: 'ArrowDown' }, slider).defaultPrevented).toBe(false)

    const handled = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    handled.preventDefault()
    act(() => {
      document.body.dispatchEvent(handled)
    })
    expect(scrolled).toEqual([])
    field.remove()
    slider.remove()
  })

  it('does nothing while the outline is closed or off screen', () => {
    withKeys(<Notation id="reply" trigger="Reply draft" sections={CLAUSES} hrefForId={hrefForId} />)
    layOut({ 'reply-1': 0, 'reply-2': 300 })
    expect(press({ key: 'ArrowDown' }).defaultPrevented).toBe(false)

    const item = document.getElementById('reply') as HTMLDetailsElement
    item.open = true
    vi.spyOn(document.querySelector('.harvard-outline')!, 'getBoundingClientRect').mockReturnValue(
      box(window.innerHeight + 10),
    )
    expect(press({ key: 'ArrowDown' }).defaultPrevented).toBe(false)
    expect(scrolled).toEqual([])
  })

  it('lets the rail keep its own arrow handling', () => {
    openReply()
    layOut({ 'reply-1': 0, 'reply-2': 300, 'reply-2a': 500, 'reply-2b': 700, 'reply-3': 900 })
    const rail = screen.getByRole('navigation', { name: 'Contents' })
    rail.focus()
    press({ key: 'ArrowDown' }, rail)
    // The rail's own step scrolls once, and the page-wide step does not add a second.
    expect(scrolled).toHaveLength(1)
    expect(window.location.hash).toBe('')
  })

  it('acts on the outline on screen when the page holds several, and lists the keys once', () => {
    const { registry } = withKeys(
      <>
        <div data-testid="first">
          <Notation id="terms" trigger="Terms" source={SOURCE} hrefForId={hrefForId} defaultOpen />
        </div>
        <div data-testid="second">
          <Notation id="reply" trigger="Reply" sections={CLAUSES} hrefForId={hrefForId} defaultOpen />
        </div>
      </>,
    )
    vi.spyOn(screen.getByTestId('first').querySelector('.harvard-outline')!, 'getBoundingClientRect').mockReturnValue(
      box(-3000, 1000),
    )
    layOut({ 'reply-1': 0, 'reply-2': 300, 'reply-2a': 500, 'reply-2b': 700, 'reply-3': 900 }, screen.getByTestId('second'))
    press({ key: 'ArrowDown' })
    expect(scrolled).toEqual([document.getElementById('reply-2')])

    expect(registry.list().filter((entry) => entry.key.startsWith('Arrow'))).toEqual([
      { key: 'ArrowDown', description: 'Next outline unit', scope: 'page' },
      { key: 'ArrowUp', description: 'Previous outline unit', scope: 'page' },
    ])
  })
})
