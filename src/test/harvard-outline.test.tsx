import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeCompany, fakeLastName } from '../../fixtures/fake.mjs'
import {
  CiteTheRecord,
  RecordCite,
  type RecordCitation,
} from '../components/CiteTheRecord'
import { HarvardOutlineViewer, type HarvardOutlineSection } from '../components/HarvardOutline'
import { locateQuote } from '../lib/locate-quote'

const SECTIONS: HarvardOutlineSection[] = [
  {
    id: 'intro',
    marker: 'I',
    title: 'Introduction',
    children: <p>Opening paragraph.</p>,
  },
  {
    id: 'facts',
    marker: 'II',
    title: 'Statement of facts',
    sections: [
      {
        id: 'agreement',
        marker: 'A',
        title: 'The supply agreement',
        children: <p>The cure clause.</p>,
      },
    ],
  },
]

const COUNTERPARTY = fakeCompany('harvard/counterparty')
const DEPONENT = `Deposition of ${fakeLastName('harvard/deponent')}`

const CITATIONS: RecordCitation[] = [
  {
    id: 'cure',
    quote: 'thirty days to cure',
    cite: 'R. 14:6',
    source: 'Supply Agreement',
    speaker: '§ 8.2',
    excerpt: `${COUNTERPARTY} shall have thirty days to cure any alleged default.`,
  },
  {
    id: 'dep',
    quote: 'we did not send a cure notice until August',
    cite: 'Dep. 18:4',
    source: DEPONENT,
    excerpt: 'A. we did not send a cure notice until August, after the window closed.',
  },
]

describe('locateQuote', () => {
  it('matches across a line break in the record, and only whitespace is forgiven', () => {
    const excerpt = 'Q. And the notice?\nA. We gave them thirty\n   days to cure, in writing.'
    const wrapped = locateQuote(excerpt, 'thirty days to cure')
    expect(wrapped.found).toBe(true)
    expect(wrapped.match).toBe('thirty\n   days to cure')
    expect(wrapped.before + wrapped.match + wrapped.after).toBe(excerpt)
    expect(locateQuote(excerpt, 'thirty days to cure.').found).toBe(false)
    expect(locateQuote('a (b) c', '(b) c').found).toBe(true)
    expect(locateQuote('body', '   ').found).toBe(false)
  })

  it('splits an excerpt around a contiguous quote', () => {
    expect(locateQuote('alpha thirty days to cure omega', 'thirty days to cure')).toEqual({
      before: 'alpha ',
      match: 'thirty days to cure',
      after: ' omega',
      found: true,
    })
  })

  it('reports a miss rather than inventing a span', () => {
    expect(locateQuote('the warehouse closed at 16:00', 'never received the goods')).toEqual({
      before: 'the warehouse closed at 16:00',
      match: '',
      after: '',
      found: false,
    })
  })

  it('does not mark an empty quote', () => {
    expect(locateQuote('body', '')).toEqual({
      before: 'body',
      match: '',
      after: '',
      found: false,
    })
  })
})

/** Place the document pane and named units at these viewport tops. */
function layOut(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    const node =
      id === 'doc'
        ? document.querySelector('.harvard-outline__doc')!
        : document.querySelector(`article[data-harvard-id="${id}"]`)!
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ y: top, width: 400, height: 200 }),
    )
  }
}

function scroll(target: EventTarget) {
  act(() => {
    target.dispatchEvent(new Event('scroll'))
  })
}

function currentUnit() {
  return document.querySelector('.harvard-outline__unit--current')?.getAttribute('data-harvard-id')
}

describe('HarvardOutlineViewer', () => {
  beforeEach(() => {
    // One frame per call, run at once, so a scroll's recomputation is observable.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders Harvard markers and highlights the first unit', () => {
    render(<HarvardOutlineViewer sections={SECTIONS} />)

    expect(screen.getByRole('navigation', { name: 'Harvard outline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Introduction/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(document.querySelector('[data-harvard-path="II.A"]')).toHaveTextContent(
      'The supply agreement',
    )
  })

  it('jumps to a nested section from the navigator', async () => {
    const user = userEvent.setup()
    render(<HarvardOutlineViewer sections={SECTIONS} />)

    await user.click(screen.getByRole('button', { name: /The supply agreement/ }))

    expect(screen.getByRole('button', { name: /The supply agreement/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'agreement',
    )
  })

  it('steps with j and k when the navigator has focus', async () => {
    const user = userEvent.setup()
    render(<HarvardOutlineViewer sections={SECTIONS} />)

    screen.getByRole('navigation', { name: 'Harvard outline' }).focus()
    await user.keyboard('j')
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'facts',
    )

    await user.keyboard(' ')
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'agreement',
    )

    await user.keyboard('k')
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'facts',
    )
  })

  it('highlights the last unit whose top has reached the viewport, not the first one visible', () => {
    const onActiveIdChange = vi.fn()
    render(
      <HarvardOutlineViewer sections={SECTIONS} scrollMode="page" onActiveIdChange={onActiveIdChange} />,
    )
    // After an instant jump to II.A: I and II are above the viewport, II.A
    // rests at its 8px scroll margin, which counts as having reached the top.
    document.querySelector<HTMLElement>('article[data-harvard-id="intro"]')!.style.scrollMarginTop = '8px'
    layOut({ doc: -400, intro: -400, facts: -200, agreement: 8 })
    scroll(window)
    expect(currentUnit()).toBe('agreement')
    expect(onActiveIdChange).toHaveBeenCalledTimes(1)

    // A unit part-way down the viewport has not been reached yet.
    layOut({ doc: -100, intro: -100, facts: 40, agreement: 400 })
    scroll(window)
    expect(currentUnit()).toBe('intro')

    // Scrolling within the same unit reports nothing new.
    scroll(window)
    expect(onActiveIdChange).toHaveBeenCalledTimes(2)
  })

  it('keeps the first unit before the document reaches the top', () => {
    render(<HarvardOutlineViewer sections={SECTIONS} scrollMode="page" />)
    layOut({ doc: 300, intro: 300, facts: 500, agreement: 700 })
    scroll(window)
    expect(currentUnit()).toBe('intro')
  })

  it('measures a scrolling pane from the pane top', () => {
    render(<HarvardOutlineViewer sections={SECTIONS} />)
    layOut({ doc: 200, intro: 0, facts: 203, agreement: 400 })
    scroll(document.querySelector('.harvard-outline__doc')!)
    expect(currentUnit()).toBe('facts')
  })

  it('does not track an outline that is not rendered', () => {
    render(
      <details>
        <summary>Closed</summary>
        <HarvardOutlineViewer sections={SECTIONS} scrollMode="page" />
      </details>,
    )
    // A closed <details> lays its content out with no box at all.
    scroll(window)
    expect(currentUnit()).toBe('intro')

    layOut({ doc: -400, intro: -400, facts: 0, agreement: 300 })
    act(() => {
      document.querySelector('details')!.dispatchEvent(new Event('toggle'))
    })
    expect(currentUnit()).toBe('facts')
  })

  it('stops tracking when unmounted', () => {
    const { unmount } = render(<HarvardOutlineViewer sections={SECTIONS} scrollMode="page" />)
    unmount()
    expect(() => scroll(window)).not.toThrow()
  })

  it('carries each unit depth and indents nested units in the document', () => {
    render(<HarvardOutlineViewer sections={SECTIONS} />)
    expect(document.querySelector('[data-harvard-id="intro"]')).toHaveAttribute('data-depth', '1')
    expect(document.querySelector('article[data-harvard-id="agreement"]')).toHaveAttribute('data-depth', '2')
  })

  it('clamps unit depth the way the rail does', () => {
    let deep: HarvardOutlineSection = { id: 'depth-8', marker: 'a', title: 'Deepest' }
    for (let depth = 7; depth >= 1; depth -= 1) {
      deep = { id: `depth-${depth}`, marker: String(depth), title: `Depth ${depth}`, sections: [deep] }
    }
    render(<HarvardOutlineViewer sections={[deep]} />)
    expect(document.querySelector('article[data-harvard-id="depth-8"]')).toHaveAttribute('data-depth', '6')
    expect(document.querySelector('[data-harvard-nav-id="depth-8"]')).toHaveAttribute('data-depth', '6')
  })

  it('opens an uncaptioned clause beside its marker and labels the rail with its words', () => {
    const CLAUSE = 'The provider delivers the services described in the order form.'
    const SUBCLAUSE = 'within ten business days of each request;'
    render(
      <HarvardOutlineViewer
        sections={[
          {
            id: 'clause-3',
            marker: '3',
            children: <p>{CLAUSE}</p>,
            sections: [
              {
                id: 'clause-3a',
                marker: 'a',
                blocks: [{ id: 'clause-3a-1', type: 'paragraph', text: SUBCLAUSE, runs: [{ id: 'r', type: 'text', text: SUBCLAUSE }] }],
              },
            ],
          },
          { id: 'clause-4', marker: '4', title: 'Term' },
        ]}
      />,
    )

    const clause = document.querySelector('article[data-harvard-id="clause-3"]')!
    expect(clause.querySelector('.harvard-outline__heading')).toBeNull()
    expect(clause.querySelector('.harvard-outline__clause > .harvard-outline__marker')).toHaveTextContent('3.')
    expect(clause.querySelector('.harvard-outline__clause-body')).toHaveTextContent(CLAUSE)
    // The words appear once in the document, not as a heading and again as the body.
    expect(clause.textContent?.split(CLAUSE)).toHaveLength(2)

    const rail = screen.getByRole('navigation')
    expect(within(rail).getByRole('button', { name: /The provider delivers/ })).toBeInTheDocument()
    expect(rail.querySelector('[data-harvard-nav-id="clause-3a"] .harvard-outline__label')).toHaveTextContent(SUBCLAUSE)
    expect(rail.querySelector('[data-harvard-nav-id="clause-3"] .harvard-outline__label')?.textContent).toBe(CLAUSE)

    // A captioned unit keeps its heading.
    expect(document.querySelector('article[data-harvard-id="clause-4"] .harvard-outline__heading')).toHaveTextContent('4. Term')
  })

  it('labels an empty uncaptioned unit with nothing rather than inventing words', () => {
    render(<HarvardOutlineViewer sections={[{ id: 'blank', marker: '1', children: [null, 'Reserved', 2] }]} />)
    expect(document.querySelector('[data-harvard-nav-id="blank"] .harvard-outline__label')?.textContent).toBe('Reserved 2')
  })

  it('resets the highlight when the outline is replaced', () => {
    const { rerender } = render(<HarvardOutlineViewer sections={SECTIONS} />)
    rerender(<HarvardOutlineViewer sections={[{ id: 'only', marker: 'I', title: 'Only' }]} />)
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'only',
    )
  })

  it('reports the active unit when controlled', async () => {
    const user = userEvent.setup()
    const onActiveIdChange = vi.fn()
    render(
      <HarvardOutlineViewer
        sections={SECTIONS}
        activeId="intro"
        onActiveIdChange={onActiveIdChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Statement of facts/ }))
    expect(onActiveIdChange).toHaveBeenCalledWith('facts')
    expect(screen.getByRole('button', { name: /Introduction/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('renders an empty state when there are no sections', () => {
    render(<HarvardOutlineViewer sections={[]} />)
    expect(screen.getByText('This outline has no sections yet.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('stays on the last unit when stepping past the end', async () => {
    const user = userEvent.setup()
    render(<HarvardOutlineViewer sections={SECTIONS} />)
    screen.getByRole('navigation').focus()
    await user.keyboard('j')
    await user.keyboard('j')
    await user.keyboard('j')
    await user.keyboard('{ArrowDown}')
    expect(document.querySelector('.harvard-outline__unit--current')).toHaveAttribute(
      'data-harvard-id',
      'agreement',
    )
  })

  it('scrolls instantly when the reader prefers reduced motion', async () => {
    const user = userEvent.setup()
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia

    render(<HarvardOutlineViewer sections={SECTIONS} />)
    await user.click(screen.getByRole('button', { name: /Statement of facts/ }))
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    })
  })
})

describe('CiteTheRecord', () => {
  it('opens the first cited passage in the record pane', () => {
    render(<CiteTheRecord citations={CITATIONS} />)

    expect(screen.getByRole('navigation', { name: 'Cite the record' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /R\. 14:6/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(document.querySelector('mark')).toHaveTextContent('thirty days to cure')
    expect(screen.getByText('§ 8.2')).toBeInTheDocument()
  })

  it('moves to the next quote from the rail', async () => {
    const user = userEvent.setup()
    render(<CiteTheRecord citations={CITATIONS} />)

    await user.click(screen.getByRole('button', { name: /Dep\. 18:4/ }))
    expect(document.querySelector('mark')).toHaveTextContent(
      'we did not send a cure notice until August',
    )
    expect(screen.getByText(DEPONENT)).toBeInTheDocument()
  })

  it('says so when the quoted words are not in the excerpt', () => {
    render(
      <CiteTheRecord
        citations={[
          {
            id: 'miss',
            quote: 'the warehouse never received the goods',
            cite: 'R. 22:1',
            source: 'Warehouse log',
            excerpt: 'Dock 4 closed at 16:00.',
          },
        ]}
      />,
    )

    expect(screen.getByText('The quoted words do not appear in this excerpt.')).toBeInTheDocument()
    expect(document.querySelector('mark')).toBeNull()
  })

  it('steps quotes with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<CiteTheRecord citations={CITATIONS} />)
    screen.getByRole('navigation', { name: 'Cite the record' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /Dep\. 18:4/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    await user.keyboard('k')
    expect(screen.getByRole('button', { name: /R\. 14:6/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: /R\. 14:6/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('omits the speaker line when the citation has none', () => {
    render(
      <CiteTheRecord
        citations={[
          {
            id: 'log',
            quote: 'Dock 4 closed',
            cite: 'R. 22:1',
            source: 'Warehouse log',
            excerpt: 'Dock 4 closed at 16:00.',
          },
        ]}
      />,
    )
    expect(document.querySelector('.cite-the-record__speaker')).toBeNull()
    expect(document.querySelector('mark')).toHaveTextContent('Dock 4 closed')
  })

  it('reports the active citation when controlled', async () => {
    const user = userEvent.setup()
    const onActiveIdChange = vi.fn()
    render(
      <CiteTheRecord citations={CITATIONS} activeId="cure" onActiveIdChange={onActiveIdChange} />,
    )
    await user.click(screen.getByRole('button', { name: /Dep\. 18:4/ }))
    expect(onActiveIdChange).toHaveBeenCalledWith('dep')
    expect(screen.getByRole('button', { name: /R\. 14:6/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('renders an empty state when nothing is cited', () => {
    render(<CiteTheRecord citations={[]} />)
    expect(screen.getByText('No quoted passages are cited to the record.')).toBeInTheDocument()
  })
})

describe('RecordCite', () => {
  it('pulls the matching record span into a dialog', async () => {
    const user = userEvent.setup()
    render(<RecordCite citation={CITATIONS[0]!} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cite the record · R. 14:6' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Supply Agreement · R. 14:6')
    expect(dialog.querySelector('mark')).toHaveTextContent('thirty days to cure')
  })

  it('renders a custom quote body when given children', () => {
    render(
      <RecordCite citation={CITATIONS[0]!}>
        Counsel quotes the cure window in full.
      </RecordCite>,
    )
    expect(screen.getByText('Counsel quotes the cure window in full.')).toBeInTheDocument()
  })

  it('closes the locator from the dialog control', async () => {
    const user = userEvent.setup()
    render(<RecordCite citation={CITATIONS[0]!} />)
    await user.click(screen.getByRole('button', { name: /Cite the record/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
