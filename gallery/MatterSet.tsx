import type { ComponentType, ReactNode } from 'react'

import { fakeJudge, fakeSentence } from '../fixtures/fake.mjs'
import {
  CAPTION,
  CLIENT,
  COMPLAINT_PDF,
  DEFENDANT_SHORT,
  FIRM,
  LAWYER,
  MATTER_CODE,
  OPPOSING_COUNSEL,
  PLAINTIFF,
} from '../fixtures/matter.mjs'
import {
  AuthorityList,
  CaseNav,
  Feed,
  Layout,
  LocationMap,
  Record,
  ReviewNav,
  SourceThread,
  StatusStrip,
  type Authority,
  type FeedPost,
  type LocationMapFeature,
} from '../src/index'

interface SectionProps {
  title: string
  note?: ReactNode
  children: ReactNode
}

const JUDGE = fakeJudge('gallery/matter-set/judge')
const COMPLAINT = `${import.meta.env.BASE_URL}specimens/${COMPLAINT_PDF}.pdf`

const AUTHORITIES: Authority[] = [
  {
    key: 'complaint',
    title: `${CAPTION} — Complaint`,
    sourceType: 'Specimen pleading',
    citation: `No. ${MATTER_CODE}`,
    pin: '2',
    holding: fakeSentence('gallery/matter-set/holding'),
    support: fakeSentence('gallery/matter-set/support'),
    pdf: COMPLAINT,
    page: 2,
    badges: [{ label: 'Record', tone: 'source' }],
  },
  {
    key: 'complaint-relief',
    title: `${CAPTION} — Prayer for relief`,
    sourceType: 'Specimen pleading',
    citation: `No. ${MATTER_CODE}`,
    pin: '3',
    holding: fakeSentence('gallery/matter-set/relief'),
    support: fakeSentence('gallery/matter-set/relief-support'),
    pdf: COMPLAINT,
    page: 3,
  },
]

const POSTS: FeedPost[] = [
  {
    id: 'order',
    date: '2026-02-09',
    dateLabel: 'Feb 9, 2026',
    actor: JUDGE.name,
    role: 'Dept. 12',
    initials: JUDGE.initials,
    accent: 'brand',
    kind: 'Order',
    tone: 'ready',
    title: 'Protective order granted',
    body: fakeSentence('gallery/matter-set/order'),
    sources: [{ label: 'Complaint', href: COMPLAINT }],
  },
  {
    id: 'motion',
    date: '2025-12-23',
    dateLabel: 'Dec 23, 2025',
    actor: LAWYER.name,
    initials: LAWYER.initials,
    accent: 'link',
    title: 'Motion for protective order filed',
    body: fakeSentence('gallery/matter-set/motion'),
  },
]

/* An invented block: two streets, a park, and a pond around the marker. */
const CENTER = { latitude: 36.17, longitude: -115.14 }
const FEATURES: LocationMapFeature[] = [
  { id: 'street-a', kind: 'road', geometry: { type: 'LineString', coordinates: [[-115.143, 36.169], [-115.137, 36.171]] } },
  { id: 'street-b', kind: 'road', geometry: { type: 'LineString', coordinates: [[-115.141, 36.167], [-115.139, 36.173]] } },
  {
    id: 'park',
    kind: 'vegetation',
    geometry: { type: 'Polygon', coordinates: [[[-115.1435, 36.1715], [-115.1415, 36.1715], [-115.1415, 36.1728], [-115.1435, 36.1728], [-115.1435, 36.1715]]] },
  },
  {
    id: 'pond',
    kind: 'water',
    geometry: { type: 'Polygon', coordinates: [[[-115.1385, 36.1675], [-115.1372, 36.1675], [-115.1372, 36.1684], [-115.1385, 36.1684], [-115.1385, 36.1675]]] },
  },
]

/** The matter surfaces: the bars, the record, and the sources a case page is built from. */
export function MatterSet({ Section }: { Section: ComponentType<SectionProps> }) {
  return (
    <>
      <Section title="Case navigation" note="The sticky bar every case surface carries, and the in-page anchors under it on a long review.">
        <div className="gallery__frame">
          <CaseNav
            brand={`${FIRM.toUpperCase()} · ${DEFENDANT_SHORT.toUpperCase()}`}
            caption={CAPTION}
            links={[
              { label: 'Status', href: '#status' },
              { label: 'Review', href: '#review', current: true },
              { label: 'File', href: '#file', emphasis: true },
            ]}
          />
          <ReviewNav
            items={[
              { id: 'record-and-status', label: 'Record' },
              { id: 'source-thread', label: 'Sources' },
              { id: 'authorities', label: 'Authorities' },
            ]}
          />
        </div>
      </Section>

      <Section title="Record and status" note="A Layout puts the dated record beside the strip of terms that are settled and those still open.">
        <Layout>
          <div>
            <Record dateTime="2026-02-09" when="Feb 9, 2026" title="Protective order granted">
              {fakeSentence('gallery/matter-set/record')}
            </Record>
            <Record dateTime="2025-12-23" when="Dec 23, 2025" title="Motion filed" />
          </div>
          <StatusStrip
            cells={[
              { label: 'Deadline', value: 'Mar 2' },
              { label: 'Scope', value: 'Agreed', tone: 'term-agreed' },
              { label: 'Fees', value: 'Continued', tone: 'term-continuation' },
            ]}
          />
        </Layout>
      </Section>

      <Section title="Source thread" note="Correspondence quoted verbatim: the body keeps its whitespace, because reflowing it would misquote the record.">
        <SourceThread
          messages={[
            {
              id: 'first',
              meta: [
                { label: 'From', value: OPPOSING_COUNSEL.name },
                { label: 'To', value: LAWYER.name },
                { label: 'Subject', value: CAPTION },
              ],
              body: `${fakeSentence('gallery/matter-set/letter-1')}\n\n${fakeSentence('gallery/matter-set/letter-2')}`,
            },
            {
              id: 'reply',
              meta: [
                { label: 'From', value: LAWYER.name },
                { label: 'Cc', value: CLIENT.name },
              ],
              body: fakeSentence('gallery/matter-set/reply'),
            },
          ]}
        />
      </Section>

      <Section title="Authorities" note={`Each opens a side-by-side source viewer on ${PLAINTIFF.lastName}'s specimen complaint, and remembers what has been verified.`}>
        <AuthorityList authorities={AUTHORITIES} storageKey="gallery-matter-set-authorities" />
      </Section>

      <Section title="Feed" note="The matter's events on a timeline rail, with a marker where the year changes.">
        <Feed posts={POSTS} aria-label="Matter events" />
      </Section>

      <Section title="Location map" note="Drawn from geometry the page already holds. No tile server is asked for anything.">
        <LocationMap features={FEATURES} center={CENTER} label="An invented block, with the location marked" />
      </Section>
    </>
  )
}
