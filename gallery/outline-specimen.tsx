import { DEFENDANT_SHORT, DEPONENT_SHORT, PLAINTIFF } from '../fixtures/matter.mjs'
import { fakeParagraph, fakeSentence, fakeTitle } from '../fixtures/fake.mjs'
import { RecordCite, type RecordCitation } from '../src/components/CiteTheRecord'
import type { HarvardOutlineSection } from '../src/components/HarvardOutline'
import { deriveNotationChecklist, parseNotation } from '../src/lib/notation'

/**
 * Invented brief excerpts. Each quote sits inside its excerpt verbatim, which
 * is what `RecordCite`'s quote-locating needs in order to have anything to find.
 */
export const CURE_NOTICE: RecordCitation = {
  id: 'cure-notice',
  quote: `${DEFENDANT_SHORT} shall have thirty days to cure any alleged default`,
  cite: 'R. 14:6–8',
  source: 'Supply Agreement dated 14 March 2023',
  speaker: '§ 8.2 · Cure',
  excerpt:
    `8.2 Cure. Upon written notice of default, ${DEFENDANT_SHORT} shall have thirty days to cure any alleged default before the non-breaching party may terminate or seek damages. Notice is effective on the date of delivery to the address in § 12.`,
}

export const DEPOSITION_QUOTE: RecordCitation = {
  id: 'officer-dep',
  quote: 'we did not send a cure notice until August',
  cite: 'Dep. 18:4–9',
  source: `Deposition of ${DEPONENT_SHORT}, 12 August 2026`,
  speaker: DEPONENT_SHORT,
  excerpt:
    `Q. When did ${DEFENDANT_SHORT} first give written notice of the alleged default?\nA. I reviewed the file. we did not send a cure notice until August, after the delivery window had already closed.\nQ. And the agreement required thirty days?\nA. That is what § 8.2 says.`,
}

export const MISSING_SPAN: RecordCitation = {
  id: 'missing-span',
  quote: 'the warehouse never received the goods',
  cite: 'R. 22:1',
  source: 'Warehouse log, 2 August 2026',
  excerpt: '2 August 2026. Dock 4 closed at 16:00. No inbound freight recorded after 15:40.',
}

export const RECORD_CITATIONS: RecordCitation[] = [CURE_NOTICE, DEPOSITION_QUOTE, MISSING_SPAN]

export const MOTION_SECTIONS: HarvardOutlineSection[] = [
  {
    id: 'intro',
    marker: 'I',
    title: 'Introduction',
    children: (
      <p>
        {PLAINTIFF.lastName} moves for summary judgment on the breach claim. The supply agreement
        required notice and a cure window; the record shows neither arrived in time.
      </p>
    ),
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
        children: (
          <>
            <p>
              Section 8.2 of the agreement is the cure clause the motion turns on.
              The quoted language is the operative sentence, not a paraphrase.
            </p>
            <RecordCite citation={CURE_NOTICE} />
          </>
        ),
      },
      {
        id: 'notice',
        marker: 'B',
        title: 'The August notice',
        children: (
          <>
            <p>
              Counsel for {DEFENDANT_SHORT} testified that written notice went out only after
              the delivery window closed.
            </p>
            <RecordCite citation={DEPOSITION_QUOTE} />
          </>
        ),
      },
    ],
  },
  {
    id: 'argument',
    marker: 'III',
    title: 'Argument',
    sections: [
      {
        id: 'failed-cure',
        marker: 'A',
        title: 'Notice was untimely',
        children: (
          <p>
            A cure window that starts after performance is impossible is not the
            window the agreement described.
          </p>
        ),
      },
    ],
  },
]

export const GENERATED_NOTATION = parseNotation([
  `I. ${fakeTitle('gallery/notation/section')}`,
  fakeParagraph('gallery/notation/body-one', 4),
  `II. ${fakeTitle('gallery/notation/second-section')}`,
  fakeParagraph('gallery/notation/body-two', 4),
  `III. ${fakeTitle('gallery/notation/third-section')}`,
  `A. ${fakeTitle('gallery/notation/subsection')}`,
  `[${fakeTitle('gallery/notation/hold-label').toUpperCase()} — ${fakeSentence('gallery/notation/hold')}]`,
  `${fakeTitle('gallery/notation/blank-lead')}: [${fakeTitle('gallery/notation/blank-label').toUpperCase()}]`,
  `[resolved. ${fakeSentence('gallery/notation/resolved')}]`,
].join('\n\n'))

export const GENERATED_NOTATION_CHECKLIST = deriveNotationChecklist(GENERATED_NOTATION)

export const NOTATION_TEMPLATE_SOURCE = [
  '---',
  'kind: agreement',
  '---',
  `# ${fakeTitle('gallery/notation-viewer/title')}`,
  '',
  `${fakeParagraph('gallery/notation-viewer/preamble', 2)} {{${fakeTitle('gallery/notation-viewer/preamble-term')}}}.`,
  '',
  `> ${fakeSentence('gallery/notation-viewer/quotation')}`,
  '',
  `## I. ${fakeTitle('gallery/notation-viewer/section-one')}`,
  '',
  `1. ${fakeSentence('gallery/notation-viewer/ordered-one')}`,
  `2. ${fakeSentence('gallery/notation-viewer/ordered-two')}`,
  '',
  `## II. ${fakeTitle('gallery/notation-viewer/section-two')}`,
  '',
  `${fakeTitle('gallery/notation-viewer/term-lead')}: {{${fakeTitle('gallery/notation-viewer/section-term')}}}.`,
].join('\n')
