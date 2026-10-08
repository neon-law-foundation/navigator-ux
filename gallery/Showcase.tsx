import { useState } from 'react'

import { fakePerson } from '../fixtures/fake.mjs'
import { CAPTION } from '../fixtures/matter.mjs'
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  ButtonRow,
  Callout,
  CaseHead,
  CheckboxField,
  CiteTheRecord,
  ClaimTable,
  type ClaimTableColumn,
  DatePicker,
  Decision,
  DecisionGrid,
  DownloadCard,
  DownloadGrid,
  DraftCard,
  FactCard,
  FactGrid,
  FormCard,
  HarvardOutlineViewer,
  InputOTP,
  LegalDisclaimer,
  LinkButton,
  Panel,
  Progress,
  RadioGroup,
  Record as DocketRecord,
  SelectField,
  Stack,
  TextareaField,
  TextField,
} from '../src/index'
import { DesignPage } from './design-page'
import { MOTION_SECTIONS, RECORD_CITATIONS } from './outline-specimen'
import { NeonSite } from './neon-site'
import { PageCardArt, PageFigurePanel } from './page-figures'
import { PitchToPleadingsJourney } from './pitch-to-pleadings'
import { neonHref, pageHref, readGalleryLocation } from './routes'
import { GalleryFrame } from './site-frame'

type Council = 'Client Council' | 'Legal Council' | 'Engineering Council'
type PageKind =
  | 'form'
  | 'review'
  | 'timeline'
  | 'document'
  | 'queue'
  | 'workflow'
  | 'outline'
  | 'verify'
  | 'journey'

interface Persona {
  sign: string
  council: Council
  role: string
  lens: string
}

interface SamplePage {
  id: string
  title: string
  summary: string
  stage: string
  audience: 'Client' | 'Lawyer' | 'Shared'
  kind: PageKind
  persona: string
  topics: string[]
}

type ReviewRow = { item: string; status: string; owner: string }
type QueueRow = { work: string; owner: string; status: string }

const REVIEW_COLUMNS: ClaimTableColumn<ReviewRow>[] = [
  { key: 'item', header: 'Item', cell: (row) => row.item },
  { key: 'status', header: 'Status', cell: (row) => <ReviewStatus status={row.status} /> },
  { key: 'owner', header: 'Owner', cell: (row) => row.owner },
]

const QUEUE_COLUMNS: ClaimTableColumn<QueueRow>[] = [
  { key: 'work', header: 'Work item', cell: (row) => row.work },
  { key: 'owner', header: 'Owner', cell: (row) => row.owner },
  { key: 'status', header: 'Status', cell: (row) => <QueueStatus status={row.status} /> },
]

const PERSONAS: Persona[] = [
  { sign: '♍ Virgo', council: 'Engineering Council', role: 'Engineering manager — chair', lens: 'Name the decision, hold every voice to paths and symbols, close with consensus and one next step.' },
  { sign: '♈ Aries', council: 'Engineering Council', role: 'Incident commander', lens: 'Name the gap: what is missing, broken, or unstated.' },
  { sign: '♉ Taurus', council: 'Engineering Council', role: 'Production engineer', lens: 'Demand the file path, the line, the user moment in prod.' },
  { sign: '♊ Gemini', council: 'Engineering Council', role: 'API / integration engineer', lens: 'Notice the duality: one word, two meanings; one shape, two layers.' },
  { sign: '♋ Cancer', council: 'Engineering Council', role: 'New hire / applicant-reader', lens: 'What does a first-time reader see first, and what confuses them?' },
  { sign: '♌ Leo', council: 'Engineering Council', role: 'Tech lead / DevRel', lens: 'Find the one-sentence cadence the team will quote back.' },
  { sign: '♎ Libra', council: 'Engineering Council', role: 'Release manager', lens: 'Weigh the scope: one PR or three? The smallest change that preserves the load-bearing property.' },
  { sign: '♏ Scorpio', council: 'Engineering Council', role: 'Security / trust & safety engineer', lens: 'Cut to the core: the claim everything else rests on, and the assumption that silently breaks it.' },
  { sign: '♐ Sagittarius', council: 'Engineering Council', role: 'Product manager', lens: 'Why this matters beyond the task, who it is for, and how it ties back to the mission.' },
  { sign: '♑ Capricorn', council: 'Engineering Council', role: 'Graybeard / lawyer engineer', lens: 'What happens in two years, when the team has tripled? Convention over cleverness.' },
  { sign: '♒ Aquarius', council: 'Engineering Council', role: 'Network / platform engineer', lens: 'Where else does this shape appear? Is the new code a special case of something already general?' },
  { sign: '♓ Pisces', council: 'Engineering Council', role: 'Original author / migration engineer', lens: 'Honor what works. New layers add; they rarely replace.' },
  { sign: '♑ Capricorn', council: 'Legal Council', role: 'Managing partner / senior counsel', lens: 'Institutional memory, ethics, and durable commitments.' },
  { sign: '♏ Scorpio', council: 'Legal Council', role: 'Ethics and compliance counsel', lens: 'Conflicts, candor, fiduciary duty, and trust.' },
  { sign: '♈ Aries', council: 'Legal Council', role: 'Trial attorney', lens: 'Lead with the harm and the next decisive move.' },
  { sign: '♉ Taurus', council: 'Legal Council', role: 'Business attorney', lens: 'Make the language operative and usable.' },
  { sign: '♊ Gemini', council: 'Legal Council', role: 'Appellate attorney', lens: 'Find ambiguity, missing definitions, and dual meanings.' },
  { sign: '♋ Cancer', council: 'Legal Council', role: 'Legal-aid / tenant-defense attorney', lens: 'Read as the person under the most pressure.' },
  { sign: '♌ Leo', council: 'Legal Council', role: 'Immigration defense attorney', lens: 'Speak boldly for the right to remain.' },
  { sign: '♍ Virgo', council: 'Legal Council', role: 'Tax attorney', lens: 'Demand exact forms, dates, triggers, and citations.' },
  { sign: '♎ Libra', council: 'Legal Council', role: 'Mediator / family-law attorney', lens: 'Balance protection, cost, and workable agreement.' },
  { sign: '♐ Sagittarius', council: 'Legal Council', role: 'Public-interest / civil-rights attorney', lens: 'Keep access to justice visible.' },
  { sign: '♒ Aquarius', council: 'Legal Council', role: 'Legal-tech / knowledge-management attorney', lens: 'Turn one good page into a reusable pattern.' },
  { sign: '♓ Pisces', council: 'Legal Council', role: 'Estate-planning / mental-health-court counselor', lens: 'Honor the human story behind the record.' },
  { sign: '♎ Libra', council: 'Client Council', role: 'Prospective client at the threshold', lens: 'Does this feel trustworthy and easier than elsewhere?' },
  { sign: '♓ Pisces', council: 'Client Council', role: 'Overwhelmed person who almost did not reach out', lens: 'Is the door easy enough with nothing left to give?' },
  { sign: '♈ Aries', council: 'Client Council', role: 'Tenant facing eviction', lens: 'Speed is survival.' },
  { sign: '♉ Taurus', council: 'Client Council', role: 'First-time LLC founder', lens: 'Does the product feel solid enough to trust?' },
  { sign: '♊ Gemini', council: 'Client Council', role: 'Bilingual immigrant family', lens: 'Where does one-world wording fail two-world lives?' },
  { sign: '♋ Cancer', council: 'Client Council', role: 'Family caregiver', lens: 'What asks too much of an exhausted household?' },
  { sign: '♌ Leo', council: 'Client Council', role: 'Wronged client who wants to sue', lens: 'Honor dignity, including a no-litigation referral.' },
  { sign: '♍ Virgo', council: 'Client Council', role: 'Meticulous compliance filer', lens: 'Eliminate vague deadlines, forms, and obligations.' },
  { sign: '♏ Scorpio', council: 'Client Council', role: 'Client with a matter they are ashamed of', lens: 'Guard privacy and remove shame from the interface.' },
  { sign: '♐ Sagittarius', council: 'Client Council', role: 'Dreamer-builder', lens: 'Preserve momentum and horizon.' },
  { sign: '♑ Capricorn', council: 'Client Council', role: 'Elder planning a legacy', lens: 'Keep gravity and long-term meaning.' },
  { sign: '♒ Aquarius', council: 'Client Council', role: 'Collective organizer', lens: 'Fit nonstandard entities and communities.' },
]

const SAMPLE_PAGES: SamplePage[] = [
  {
    id: 'pitch-to-pleadings',
    title: 'Pitch to pleadings',
    summary: 'The same matter from first inquiry to a filed complaint, one Stepper, two densities.',
    stage: 'Intake through pleadings',
    audience: 'Shared',
    kind: 'journey',
    persona: 'Capricorn · senior counsel',
    topics: ['pitch', 'pleadings', 'PDF'],
  },
  { id: 'new-matter', title: 'New matter intake', summary: 'A calm first step for a person or organization asking for help.', stage: 'Discovery', audience: 'Client', kind: 'form', persona: 'Libra · threshold client', topics: ['intake', 'privacy'] },
  { id: 'conflict-check', title: 'Conflict check questionnaire', summary: 'Collect the people, entities, and relationships counsel must screen.', stage: 'Discovery', audience: 'Shared', kind: 'form', persona: 'Scorpio · ethics counsel', topics: ['conflicts', 'people'] },
  { id: 'case-strategy', title: 'Case strategy brief', summary: 'A lawyer-facing decision surface for posture, exposure, and next action.', stage: 'Discovery', audience: 'Lawyer', kind: 'review', persona: 'Aries · trial attorney', topics: ['strategy', 'review'] },
  { id: 'preservation-notice', title: 'Evidence preservation notice', summary: 'Turn a preservation request into a dated, reviewable record.', stage: 'Discovery', audience: 'Lawyer', kind: 'document', persona: 'Virgo · exacting filer', topics: ['evidence', 'drafting'] },
  { id: 'initial-disclosures', title: 'Initial disclosures tracker', summary: 'See what is known, missing, and ready for lawyer review.', stage: 'Discovery', audience: 'Shared', kind: 'queue', persona: 'Aquarius · knowledge counsel', topics: ['disclosures', 'status'] },
  { id: 'interrogatories', title: 'Interrogatory response workspace', summary: 'Organize answers, objections, and follow-up questions in one place.', stage: 'Discovery', audience: 'Lawyer', kind: 'review', persona: 'Gemini · appellate attorney', topics: ['discovery', 'answers'] },
  { id: 'motion-outline', title: 'Motion outline review', summary: 'Walk a Harvard-outlined brief while citing each direct quote back to the record.', stage: 'Pretrial', audience: 'Lawyer', kind: 'outline', persona: 'Gemini · appellate attorney', topics: ['outline', 'record'] },
  { id: 'verify-the-record', title: 'Verify the record', summary: 'Every source in the matter becomes one notation; read the brief beside the record and confirm each quoted span literally, in the excerpt it came from.', stage: 'Pretrial', audience: 'Lawyer', kind: 'verify', persona: 'Gemini · appellate attorney', topics: ['record', 'cite'] },
  { id: 'requests-production', title: 'Requests for production', summary: 'A client-friendly collection page for documents and custodians.', stage: 'Discovery', audience: 'Client', kind: 'form', persona: 'Pisces · overwhelmed client', topics: ['uploads', 'discovery'] },
  { id: 'meet-confer', title: 'Meet-and-confer log', summary: 'Record the issue, the proposal, and the next date without losing the thread.', stage: 'Discovery', audience: 'Lawyer', kind: 'timeline', persona: 'Libra · mediator', topics: ['correspondence', 'deadlines'] },
  { id: 'subpoena-packet', title: 'Subpoena packet review', summary: 'A staged review of authority, scope, service, and return materials.', stage: 'Discovery', audience: 'Lawyer', kind: 'workflow', persona: 'Capricorn · senior counsel', topics: ['subpoena', 'review'] },
  { id: 'deposition-prep', title: 'Deposition preparation', summary: 'Prepare the witness with a focused chronology and open questions.', stage: 'Discovery', audience: 'Shared', kind: 'timeline', persona: 'Cancer · stressed applicant', topics: ['witness', 'chronology'] },
  { id: 'exhibit-list', title: 'Trial exhibit list', summary: 'A clean record of exhibit number, source, status, and foundation.', stage: 'Pretrial', audience: 'Lawyer', kind: 'queue', persona: 'Virgo · compliance filer', topics: ['exhibits', 'trial'] },
  { id: 'restraining-order', title: 'New restraining order request', summary: 'A safety-first intake that separates urgent facts from supporting detail.', stage: 'Emergency relief', audience: 'Client', kind: 'form', persona: 'Aries · tenant advocate', topics: ['safety', 'intake'] },
  { id: 'serve-warrant', title: 'Serve a warrant — authority checklist', summary: 'A controlled operational page for verifying authority, service, and return.', stage: 'Enforcement', audience: 'Lawyer', kind: 'workflow', persona: 'Sagittarius · public-interest counsel', topics: ['warrant', 'service'] },
  { id: 'service-return', title: 'Service return', summary: 'Capture who served what, when, where, and what happens next.', stage: 'Enforcement', audience: 'Lawyer', kind: 'document', persona: 'Taurus · business attorney', topics: ['service', 'record'] },
  { id: 'protective-order', title: 'Protective order packet', summary: 'A review page for scope, access, redactions, and proposed language.', stage: 'Enforcement', audience: 'Shared', kind: 'review', persona: 'Scorpio · privacy client', topics: ['privacy', 'orders'] },
  { id: 'contempt-hearing', title: 'Contempt hearing preparation', summary: 'A hearing-ready chronology with decision points and open proof gaps.', stage: 'Enforcement', audience: 'Lawyer', kind: 'timeline', persona: 'Aries · trial attorney', topics: ['hearing', 'proof'] },
  { id: 'company-formation', title: 'Start a new company', summary: 'A guided formation intake for a founder creating a new entity.', stage: 'Transactional', audience: 'Client', kind: 'form', persona: 'Taurus · first-time founder', topics: ['company', 'formation'] },
  { id: 'operating-agreement', title: 'Operating agreement questionnaire', summary: 'Translate founder decisions into a document-ready set of terms.', stage: 'Transactional', audience: 'Shared', kind: 'form', persona: 'Aquarius · collective organizer', topics: ['company', 'governance'] },
  { id: 'equity-plan', title: 'Founder equity plan', summary: 'Compare ownership scenarios before the numbers become a dispute.', stage: 'Transactional', audience: 'Lawyer', kind: 'review', persona: 'Taurus · business counsel', topics: ['equity', 'decisions'] },
  { id: 'commercial-lease', title: 'Commercial lease review', summary: 'Make rent, term, renewal, and repair obligations legible at a glance.', stage: 'Transactional', audience: 'Shared', kind: 'document', persona: 'Gemini · ambiguity hunter', topics: ['lease', 'terms'] },
  { id: 'vendor-contract', title: 'Vendor agreement intake', summary: 'Gather the business deal before counsel starts marking the paper.', stage: 'Transactional', audience: 'Client', kind: 'form', persona: 'Sagittarius · builder', topics: ['contract', 'intake'] },
  { id: 'board-consent', title: 'Board consent packet', summary: 'A small, reviewable packet for an important company decision.', stage: 'Transactional', audience: 'Lawyer', kind: 'workflow', persona: 'Capricorn · senior counsel', topics: ['governance', 'approval'] },
  { id: 'trademark-clearance', title: 'Trademark clearance queue', summary: 'Track candidate marks, search notes, and recommendation status.', stage: 'Transactional', audience: 'Lawyer', kind: 'queue', persona: 'Virgo · tax and detail lens', topics: ['trademark', 'research'] },
  { id: 'beneficial-ownership', title: 'Beneficial ownership report', summary: 'A precise filing intake with an explicit review boundary.', stage: 'Transactional', audience: 'Client', kind: 'form', persona: 'Virgo · meticulous filer', topics: ['filing', 'company'] },
  { id: 'asylum-i589', title: 'Asylum application — PDF form', summary: 'A human-paced questionnaire for assembling a lawyer-reviewed asylum packet.', stage: 'Immigration', audience: 'Client', kind: 'document', persona: 'Leo · immigration advocate', topics: ['asylum', 'PDF'] },
  { id: 'humanitarian-parole', title: 'Humanitarian parole packet', summary: 'A document checklist that keeps urgency visible without rushing the record.', stage: 'Immigration', audience: 'Shared', kind: 'workflow', persona: 'Cancer · family caregiver', topics: ['immigration', 'documents'] },
  { id: 'naturalization-screening', title: 'Naturalization screening', summary: 'A plain-language screening page for eligibility questions and follow-up.', stage: 'Immigration', audience: 'Client', kind: 'form', persona: 'Gemini · bilingual family', topics: ['immigration', 'screening'] },
  { id: 'work-authorization', title: 'Work authorization renewal', summary: 'A deadline-aware renewal page with a document readiness signal.', stage: 'Immigration', audience: 'Client', kind: 'queue', persona: 'Pisces · access lens', topics: ['immigration', 'deadline'] },
  { id: 'estate-plan', title: 'Estate plan intake', summary: 'A thoughtful intake for people making decisions about a future they will not see.', stage: 'Planning', audience: 'Client', kind: 'form', persona: 'Capricorn · legacy client', topics: ['estate', 'planning'] },
  { id: 'record-expungement', title: 'Record-clearing intake', summary: 'A private, nonjudgmental intake that makes the next step concrete.', stage: 'Post-conviction', audience: 'Client', kind: 'form', persona: 'Scorpio · privacy client', topics: ['privacy', 'referral'] },
]


function Home() {
  return (
    <>
      <CaseHead
        kicker="Navigator UX · GitHub Pages specimen"
        title="Thirty-two pages for the legal work between question and answer."
        docket="static build · 33 sample journeys · 36 council voices"
        summary="A page catalog for discovery, enforcement, transactional work, immigration, and planning. Every page is a static consumer of Navigator UX, so the same library can carry a client view, a lawyer view, or both. The header on this page is the same header on every other page."
      >
        <div className="showcase__hero-actions">
          <LinkButton variant="primary" href={neonHref('home')}>Open the public site</LinkButton>
          <LinkButton href={pageHref('page', 'new-matter')}>Open a sample page</LinkButton>
          <LinkButton href={pageHref('councils')}>Meet the councils</LinkButton>
        </div>
      </CaseHead>

      <Callout tone="info">
        This is a public specimen. The names, matters, deadlines, and documents are invented. The build is published by GitHub Actions from every push to <code>main</code>.
      </Callout>

      <Panel title="Public site" note="A close reading of neonlaw.com, plus a storefront rewrite of /services.">
        <div className="showcase__page-grid">
          <a className="showcase__page-card" href={neonHref('home')}>
            <div className="showcase__page-card-topline">
              <Badge tone="next">Client</Badge>
            </div>
            <h3>Neon Law home</h3>
            <p>The live home page, rebuilt in this library: hero, four doors, the same invitation.</p>
            <span className="showcase__page-meta">Marketing · home</span>
          </a>
          <a className="showcase__page-card" href={neonHref('services')}>
            <div className="showcase__page-card-topline">
              <Badge tone="next">Client</Badge>
            </div>
            <h3>Services storefront</h3>
            <p>Search first, then an item table: numbers, categories, add on the row.</p>
            <span className="showcase__page-meta">Marketing · services</span>
          </a>
        </div>
      </Panel>

      <Panel title="The page catalog" note="Each card opens an addressable static page; the URL is safe to bookmark or share.">
        <div className="showcase__page-grid">
          {SAMPLE_PAGES.map((page) => (
            <a className="showcase__page-card" href={pageHref('page', page.id)} key={page.id}>
              <div className="showcase__page-card-art">
                <PageCardArt pageId={page.id} />
              </div>
              <div className="showcase__page-card-topline">
                <Badge tone={page.audience === 'Client' ? 'next' : page.audience === 'Lawyer' ? 'review' : 'source'}>{page.audience}</Badge>
              </div>
              <h3>{page.title}</h3>
              <p>{page.summary}</p>
              <span className="showcase__page-meta">{page.stage} · {page.kind}</span>
            </a>
          ))}
        </div>
      </Panel>

      <DecisionGrid>
        <Decision title="Client lens" kicker="12 voices" tone="ready">Plain language, privacy, momentum, and a next step a tired person can actually take.</Decision>
        <Decision title="Lawyer lens" kicker="12 voices" tone="wait">Authority, review boundaries, exactness, and records that survive the handoff.</Decision>
        <Decision title="One library" kicker="Reusable seam" tone="default">Forms, records, decisions, drafts, PDF-ready document surfaces, and the frame around them.</Decision>
      </DecisionGrid>
    </>
  )
}

function Councils() {
  const engineering = PERSONAS.filter((persona) => persona.council === 'Engineering Council')
  const legal = PERSONAS.filter((persona) => persona.council === 'Legal Council')
  const client = PERSONAS.filter((persona) => persona.council === 'Client Council')
  return (
    <>
      <CaseHead
        kicker="The zodiac councils"
        title="Thirty-six ways to notice what one pass misses."
        docket="12 engineers · 12 lawyers · 12 clients"
        summary="These are the same three benches as Neon Law Navigator: review lenses, not real agents or legal advice. The pages in this specimen are tagged with the voice whose question is most useful at that moment."
      />
      <CouncilSection title="Engineering Council" note="Architecture, refactors, abstractions, PR sequencing, and doc clarity. Virgo chairs." personas={engineering} />
      <CouncilSection title="Legal Council" note="Before copy becomes a form, template, email, or engagement paragraph." personas={legal} />
      <CouncilSection title="Client Council" note="Before intake, onboarding, pricing, or a portal page asks a real person to stay." personas={client} />
    </>
  )
}

function CouncilSection({ title, note, personas }: { title: Council; note: string; personas: Persona[] }) {
  return (
    <Panel title={title} note={note} actions={<Badge tone="source">{personas.length} voices</Badge>}>
      <div className="showcase__persona-grid">
        {personas.map((persona) => (
          <article className="showcase__persona" key={`${persona.council}-${persona.sign}`}>
            <Avatar name={persona.sign} initials={persona.sign.slice(0, 1)} size="md" />
            <div>
              <h3>{persona.sign.slice(2)}</h3>
              <p className="showcase__persona-role">{persona.role}</p>
              <p>{persona.lens}</p>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}

function PageForm({ page }: { page: SamplePage }) {
  const asylum = page.id === 'asylum-i589'
  const emergency = page.id === 'restraining-order'
  const person = fakePerson(asylum ? 'gallery/page-form/applicant' : 'gallery/page-form/filer')
  return (
    <FormCard
      title={asylum ? 'Part 1 · Applicant information' : 'Start with the facts we can act on'}
      intro={asylum ? 'This sample mirrors a PDF-form workflow: answers are collected here, then reviewed before a final packet is prepared.' : 'Save a draft at any time. A lawyer reviews the submission before anything is filed, sent, or served.'}
      notice={emergency ? 'If anyone is in immediate danger, contact emergency services first. This page is not an emergency response service.' : undefined}
      onSubmit={(event) => event.preventDefault()}
    >
      <TextField label={asylum ? 'Full legal name' : 'Your name'} name="name" defaultValue={person.name} required />
      <TextField label="Email address" name="email" type="email" defaultValue={person.email} required />
      <SelectField label={asylum ? 'Current country of residence' : 'What kind of help do you need?'} name="category" placeholder="Choose one" options={asylum ? [{ value: 'us', label: 'United States' }, { value: 'other', label: 'Another country' }] : [{ value: 'advice', label: 'Advice and planning' }, { value: 'court', label: 'A court or agency matter' }, { value: 'document', label: 'A document or form' }]} required />
      <RadioGroup legend="How should we follow up?" name="contact" defaultValue="email" choices={[{ value: 'email', label: 'Email' }, { value: 'call', label: 'Phone call' }, { value: 'unsure', label: 'I am not sure yet' }]} />
      <DatePicker label={asylum ? 'Date of last arrival' : 'Important date'} name="date" help="Use the date you know; leave a note below if you are unsure." />
      <TextareaField label={asylum ? 'Why are you seeking protection?' : 'Tell us what happened'} name="summary" rows={5} help="Plain language is welcome. Do not include passwords or payment information." />
      {asylum ? <CheckboxField label="I understand this is a sample page and not an asylum filing." name="sample" required /> : null}
      <ButtonRow>
        <Button variant="primary" type="submit">Save draft</Button>
        <LinkButton href={pageHref('home')}>Return to catalog</LinkButton>
      </ButtonRow>
    </FormCard>
  )
}

function PageReview({ page }: { page: SamplePage }) {
  const rows = [
    { item: 'Authority and scope', status: 'Confirmed', owner: 'Counsel' },
    { item: 'People and entities', status: 'Needs review', owner: 'Matter team' },
    { item: 'Supporting record', status: 'In progress', owner: 'Client' },
    { item: 'Next decision', status: 'Open', owner: 'Counsel' },
  ]
  return (
    <>
      <Panel title="Review surface" note="A compact record for deciding what can move forward and what still needs a human.">
        <ClaimTable
          caption={`${page.title} · sample review record`}
          columns={REVIEW_COLUMNS}
          rows={rows}
          rowKey={(row) => row.item}
        />
      </Panel>
      <DecisionGrid>
        <Decision title="Ready to draft" kicker="Next" tone="ready">The record has a clear owner and an explicit next step.</Decision>
        <Decision title="Hold for review" kicker="Boundary" tone="wait">One material fact or authority point is still unresolved.</Decision>
        <Decision title="Do not send yet" kicker="Safety" tone="risk">A lawyer must approve the final language before it leaves the workspace.</Decision>
      </DecisionGrid>
      <DraftCard title="Sample internal note" note="Counsel · not client-facing" text={`Review complete for ${page.title}. Confirm the missing record, then return to the decision surface before drafting.`} copyable={false} />
    </>
  )
}

function ReviewStatus({ status }: { status: string }) {
  return <Badge tone={status === 'Confirmed' ? 'ready' : 'review'}>{status}</Badge>
}

function PageTimeline({ page }: { page: SamplePage }) {
  return (
    <>
      <Panel title="Chronology" note={`${page.title} · the record is ordered, dated, and still visibly incomplete where it needs a human.`}>
        <div className="showcase__timeline">
          <DocketRecord when="12 Aug 2026" title="Request received">The matter entered the workspace with a plain-language description.</DocketRecord>
          <DocketRecord when="14 Aug 2026" title="First review">Counsel identified the governing question and one missing document.</DocketRecord>
          <DocketRecord when="18 Aug 2026" title="Next checkpoint">The team will confirm the record and choose the next safe action.</DocketRecord>
        </div>
      </Panel>
      <Callout tone="warning">This chronology is a specimen, not a filing history. Dates and names are fictional.</Callout>
      <Panel title="Open questions">
        <FactGrid>
          <FactCard title="What we know">The issue is described well enough to route.</FactCard>
          <FactCard title="What we need">One source document and a confirmed deadline.</FactCard>
          <FactCard title="Who decides">A lawyer owns the next legal judgment.</FactCard>
        </FactGrid>
      </Panel>
    </>
  )
}

function PageDocument({ page }: { page: SamplePage }) {
  const asylum = page.id === 'asylum-i589'
  return (
    <>
      <Callout tone={asylum ? 'info' : 'warning'}>
        {asylum ? 'PDF form workflow: the preview below is a static document placeholder. A production app would attach a same-origin generated PDF after lawyer review.' : 'Document workflow: the draft stays inside the workspace until the responsible lawyer approves it.'}
      </Callout>
      <div className="showcase__document-grid">
        <Panel title={asylum ? 'Form answers' : 'Document inputs'}>
          <PageForm page={page} />
        </Panel>
        <Panel title={asylum ? 'I-589 packet preview' : 'Draft packet preview'} note="Static specimen surface">
          <div className="showcase__paper" role="figure" aria-label="Sample document preview">
            <span className="showcase__paper-kicker">Navigator UX · sample</span>
            <h3>{asylum ? 'Application for Asylum and for Withholding of Removal' : page.title}</h3>
            <p>Prepared from saved answers. Review required before submission.</p>
            <div className="showcase__paper-lines" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <Badge tone="review">Not filed</Badge>
          </div>
          <DownloadGrid>
            <DownloadCard title="Blank form" badge={<Badge tone="source">PDF</Badge>} description="Placeholder download in this public specimen." actions={<LinkButton href="#blank-form">Open sample</LinkButton>} />
          </DownloadGrid>
        </Panel>
      </div>
    </>
  )
}

function PageQueue({ page }: { page: SamplePage }) {
  const data = page.id === 'work-authorization' ? [72, 78, 80, 91, 88, 94] : [42, 58, 61, 76, 69, 84]
  return (
    <>
      <Panel title="Readiness" note="A signal, not a conclusion. The accountable person still owns the decision.">
        <Progress value={data[data.length - 1]} label={`${page.title} readiness`} showValue />
      </Panel>
      <Panel title="Work queue">
        <ClaimTable
          columns={QUEUE_COLUMNS}
          rows={[{ work: 'Source record', owner: 'Client', status: 'Ready' }, { work: 'Counsel review', owner: 'Lawyer', status: 'In review' }, { work: 'Final submission', owner: 'Lawyer', status: 'Blocked' }]}
          rowKey={(row) => row.work}
        />
      </Panel>
    </>
  )
}

function QueueStatus({ status }: { status: string }) {
  return <Badge tone={status === 'Ready' ? 'ready' : 'review'}>{status}</Badge>
}

function PageWorkflow({ page }: { page: SamplePage }) {
  const [code, setCode] = useState('')
  return (
    <>
      <Panel title="Workflow checkpoints" note="Every transition names its owner and leaves a reviewable record.">
        <Progress value={58} label={`${page.title} workflow completion`} showValue />
        <Accordion
          exclusive
          items={[
            { id: 'authority', trigger: <span><Badge tone="ready">Complete</Badge> Confirm authority and scope</span>, children: <p>The responsible lawyer confirms the source, jurisdiction, and permitted next action.</p> },
            { id: 'prepare', trigger: <span><Badge tone="review">In review</Badge> Prepare the packet</span>, children: <p>People, documents, deadlines, and proposed language are gathered into one review surface.</p> },
            { id: 'handoff', trigger: <span><Badge tone="blocked">Waiting</Badge> Record the handoff</span>, children: <p>The handoff is not complete until the return, filing receipt, or client confirmation is attached.</p> },
          ]}
        />
      </Panel>
      <Panel title="Verification step" note="The code control is useful for a future signed or witnessed handoff; this page does not send anything.">
        <InputOTP label="Sample verification code" value={code} onValueChange={setCode} help="Enter any six characters to preview the component." />
        <Button variant="primary">Continue review</Button>
      </Panel>
      <LegalDisclaimer>Nothing on this page authorizes service, filing, or legal action. It demonstrates a reviewable workflow surface only.</LegalDisclaimer>
    </>
  )
}

function PageOutline() {
  return (
    <>
      <Callout tone="info">
        The navigator on the left is the brief&rsquo;s own Harvard outline. As the
        document scrolls, the current section stays marked. A direct quote opens
        the matching span in the record; a paraphrase does not light up.
      </Callout>
      <Panel title="Brief" note={`Invented motion · ${CAPTION} is a drawn caption.`}>
        <HarvardOutlineViewer sections={MOTION_SECTIONS} aria-label="Motion outline" />
      </Panel>
      <Panel title="Cite the record" note="Every quoted span the brief already committed to, located in the excerpt it came from.">
        <CiteTheRecord citations={RECORD_CITATIONS} />
      </Panel>
    </>
  )
}

function PageVerify() {
  return (
    <>
      <Callout tone="info">
        Everything in a matter is translated into one notation before anyone cites it — pleadings,
        opposing counsel&rsquo;s emails, PDFs from the court, deposition transcripts. Each becomes a
        Markdown body under a YAML front matter that names the source, the date, and the pin cites.
        Counsel reads the brief on the left and the record on the right; selecting a pin cite marks
        the quoted words in the excerpt they came from.
      </Callout>
      <div className="showcase__verify">
        <Panel title="The brief" note={`Harvard outline · invented motion in ${CAPTION}.`}>
          <HarvardOutlineViewer sections={MOTION_SECTIONS} aria-label="Motion outline beside the record" />
        </Panel>
        <Panel title="The record" note="Every quoted span, located in the notation excerpt it came from.">
          <CiteTheRecord citations={RECORD_CITATIONS} aria-label="Record beside the brief" />
        </Panel>
      </div>
      <Panel title="The match is literal">
        <p>
          The quoted span becomes a regular expression whose only tolerance is whitespace: a line
          break in the record and a space in the brief are the same character, so a quote that wraps
          across lines still matches, and nothing else does. A paraphrase does not light up. A quote
          one word off does not light up. A cite that matches was copied, not remembered — that
          exactness is the whole function, and the notation is what makes it possible to run the
          same check against a pleading, an email, and a transcript.
        </p>
      </Panel>
      <LegalDisclaimer>
        This is a verification surface, not a filing. Nothing here asserts that a
        citation is complete, and the caption is fictional.
      </LegalDisclaimer>
    </>
  )
}

function SamplePageView({ page }: { page: SamplePage }) {
  const body =
    page.kind === 'form' ? (
      <PageForm page={page} />
    ) : page.kind === 'review' ? (
      <PageReview page={page} />
    ) : page.kind === 'timeline' ? (
      <PageTimeline page={page} />
    ) : page.kind === 'document' ? (
      <PageDocument page={page} />
    ) : page.kind === 'queue' ? (
      <PageQueue page={page} />
    ) : page.kind === 'outline' ? (
      <PageOutline />
    ) : page.kind === 'verify' ? (
      <PageVerify />
    ) : page.kind === 'journey' ? (
      <PitchToPleadingsJourney />
    ) : (
      <PageWorkflow page={page} />
    )
  return (
    <>
      <div className="showcase__back"><LinkButton href={pageHref('home')}>← All sample pages</LinkButton></div>
      <CaseHead
        kicker={`${page.stage} · ${page.audience} surface`}
        title={page.title}
        docket={`${page.kind} page · council lens: ${page.persona}`}
        summary={page.summary}
      />
      <div className="showcase__topic-row">{page.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)}</div>
      <Stack>
        <PageFigurePanel pageId={page.id} />
        {body}
      </Stack>
    </>
  )
}

export function Showcase() {
  const { view, pageId } = readGalleryLocation()
  const page = SAMPLE_PAGES.find((candidate) => candidate.id === pageId)
  if (view === 'neon') return <NeonSite />
  if (view === 'design') return <GalleryFrame><DesignPage /></GalleryFrame>
  if (view === 'page' && page) return <GalleryFrame><SamplePageView page={page} /></GalleryFrame>
  if (view === 'councils') return <GalleryFrame><Councils /></GalleryFrame>
  return <GalleryFrame><Home /></GalleryFrame>
}
