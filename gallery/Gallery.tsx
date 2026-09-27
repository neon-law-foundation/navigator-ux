import { useState, type ReactNode } from 'react'
import { ShadcnSet } from './ShadcnSet'
import { ShadcnWaveTwo } from './ShadcnWaveTwo'
import { FocusSet } from './FocusSet'
import { ChatSet } from './ChatSet'
import { Showcase } from './Showcase'

// The library itself, from source. Editing a component re-renders this page.
import '../src/styles/theme.css'
import './gallery.css'

import {
  Alert,
  Breadcrumb,
  BrandEditorPanel,
  Card,
  CheckboxField,
  CiteTheRecord,
  ConfirmDelete,
  DataTable,
  ExternalLink,
  Flash,
  FormCard,
  HarvardOutlineViewer,
  Icon,
  ICON_NAMES,
  ImpersonationBanner,
  LegalDisclaimer,
  NavBadge,
  NavButton,
  NavLinkButton,
  NavigatorFooter,
  NavigatorNavbar,
  NavigatorShell,
  PageHeader,
  Pagination,
  PeopleList,
  PricingCard,
  PricingGrid,
  Prose,
  RadioGroup,
  RowActions,
  SelectField,
  serializeJsonApiSort,
  SiteFooter,
  SiteHeader,
  TestimonialCard,
  TestimonialSection,
  TextField,
  TextareaField,
  Toast,
  type DataColumn,
} from '../src/index'
import { CFO, CLIENT, DEFENDANT_SHORT, LAWYER } from '../fixtures/matter.mjs'
import {
  GENERATED_NOTATION,
  GENERATED_NOTATION_CHECKLIST,
  MOTION_SECTIONS,
  RECORD_CITATIONS,
} from './outline-specimen'
import { BrandMark } from './brand-mark'
import { navigatorBrandLinks } from './navigator-brands'
import { GALLERY_BRANDS } from './brands'
import { GalleryFrame } from './site-frame'
import { ComponentPages, SectionGroup } from './component-nav'
import { useSection } from './sections'
import { readBrandId, readComponentId, readGalleryLocation } from './routes'

/* ------------------------------------------------------------------ shell -- */

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: ReactNode
  children: ReactNode
}) {
  const { id, shown } = useSection(title)
  if (!shown) return null
  return (
    <section className="gallery__section" id={id}>
      <h2>{title}</h2>
      {note ? <p className="gallery__note">{note}</p> : null}
      {children}
    </section>
  )
}

/* The tokens a brand layer is allowed to move, plus the shared ones it is not.
   Listed rather than scraped, because the point is to show the contract. */
const BRAND_TOKENS = [
  '--nav-color-primary',
  '--nav-color-primary-hover',
  '--nav-color-primary-active',
  '--nav-color-on-primary',
  '--nav-color-on-brand',
  '--nav-color-link',
  '--nav-color-link-hover',
  '--nav-color-surface-subtle',
]

const SHARED_TOKENS = [
  '--nav-color-bg',
  '--nav-color-surface',
  '--nav-color-surface-raised',
  '--nav-color-border',
  '--nav-color-text',
  '--nav-color-text-muted',
  '--nav-color-secondary',
  '--nav-color-on-secondary',
  '--nav-color-success',
  '--nav-color-danger',
  '--nav-color-warning',
  '--nav-color-success-subtle',
  '--nav-color-danger-subtle',
  '--nav-color-warning-subtle',
  '--nav-color-notice-subtle',
  '--nav-color-danger-solid',
]

function Swatches({ tokens }: { tokens: string[] }) {
  return (
    <div className="gallery__swatches">
      {tokens.map((token) => (
        <div className="gallery__swatch" key={token}>
          <span
            className="gallery__swatch-chip"
            style={{ ['--gallery-swatch' as string]: `var(${token})` }}
            aria-hidden="true"
          />
          <span className="gallery__swatch-name">{token}</span>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- specimens -- */

interface Person {
  id: string
  name: string
  email: string
  role: string
}

const PEOPLE: Person[] = [
  { id: '1', name: LAWYER.name, email: LAWYER.email, role: 'General Counsel' },
  { id: '2', name: CLIENT.name, email: CLIENT.email, role: 'Founder' },
  { id: '3', name: CFO.name, email: CFO.email, role: 'CFO' },
]

const COLUMNS: DataColumn<Person>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name, sortable: true },
  { key: 'email', header: 'Email', cell: (row) => row.email, sortable: true },
  { key: 'role', header: 'Role', cell: (row) => row.role },
  {
    key: 'actions',
    header: 'Actions',
    cell: (row) => (
      <RowActions
        label={row.name}
        actions={[
          { kind: 'link', label: 'Edit', href: `#edit-${row.id}`, icon: 'pencil-square' },
          {
            kind: 'post',
            label: 'Delete',
            action: `#delete-${row.id}`,
            icon: 'trash3-fill',
            destructive: true,
          },
        ]}
      />
    ),
  },
]

const NAV_LINKS = [
  { label: 'Litigation', href: '#litigation' },
  { label: 'Transactional', href: '#transactional' },
  { label: 'Team', href: '#team', current: true },
]

/* ---------------------------------------------------------------- gallery -- */

export function Gallery() {
  const [confirming, setConfirming] = useState(false)
  const brandId = readBrandId()
  const brand = GALLERY_BRANDS.find((entry) => entry.id === brandId)
  if (readGalleryLocation().view !== 'components') return <Showcase />

  return (
    <GalleryFrame>
        <PageHeader
          title="Design system"
          summary="Every block is the real component the pages use. One per page; the rest are a click away."
          actions={<NavLinkButton variant="primary" href="#book">Book a call</NavLinkButton>}
        />
      <ComponentPages selected={readComponentId()}>

        <Section
          title="Brand tokens"
          note="The eight semantic tokens a brand layer redeclares. The bar above attaches a real brand sheet at :root:root; Neon Law is the library with no extra layer."
        >
          <Swatches tokens={BRAND_TOKENS} />
        </Section>

        <Section
          title="Shared tokens"
          note="Surfaces, borders, text, and the status colors stay shared unless a brand argues for its own ground — Lawyer Shook's legal pad is that case."
        >
          <Swatches tokens={SHARED_TOKENS} />
        </Section>

        <Section
          title="Icons"
          note="Inline SVG, sized at 1em, inheriting the surrounding text color. No icon font and no runtime fetch."
        >
          <div className="gallery__icons">
            {ICON_NAMES.map((name) => (
              <span className="gallery__icon" key={name}>
                <Icon name={name} />
                {name}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Buttons and badges">
          <div className="gallery__row">
            <NavButton variant="primary">Primary</NavButton>
            <NavButton variant="secondary">Secondary</NavButton>
            <NavButton variant="danger">Delete</NavButton>
            <NavButton>Unvariant</NavButton>
            <NavLinkButton variant="primary" href="#x">Link as button</NavLinkButton>
            <NavBadge>Approved</NavBadge>
          </div>
        </Section>

        <Section title="Cards">
          <div className="gallery__grid">
            <Card header="Plain card" footer="Footer band">
              <p>The shared surface: border, radius, shadow.</p>
            </Card>
            <Card header="Recommended" highlighted>
              <p>The brand anchor treatment — the header band takes the brand color.</p>
            </Card>
            <Card centered>
              <p>A body-only card, centered.</p>
            </Card>
          </div>
        </Section>

        <Section title="Pricing">
          <PricingGrid>
            <PricingCard
              name="Hourly"
              amount="$650"
              period="per hour"
              summary="For discrete matters."
              features={['Litigation', 'Motion practice']}
              cta={{ label: 'Enquire', href: '#hourly' }}
            />
            <PricingCard
              name="Company counsel"
              amount="$4,500"
              period="per month"
              summary="Everything a company needs, on a flat fee."
              features={['Unlimited calls', 'Contract review', 'Board support']}
              cta={{ label: 'Get started', href: '#counsel' }}
              recommended
            />
            <PricingCard name="Contingency" amount="30%" period="of recovery" features={['No fee unless you win']} />
          </PricingGrid>
        </Section>

        <Section title="Testimonials">
          <TestimonialSection heading="What clients say" intro="A few of them.">
            <TestimonialCard
              label="Litigation"
              quote="They read the whole record and found the one line that mattered."
              name={LAWYER.name}
              title="General Counsel, Acme"
            />
            <TestimonialCard
              label="Company counsel"
              quote="A flat fee and an actual answer the same day."
              name={CLIENT.name}
              title={`Founder, ${DEFENDANT_SHORT}`}
            />
          </TestimonialSection>
        </Section>

        <Section title="Toasts" note="Four tones, each an alert.">
          <div className="gallery__stack">
            <Toast tone="primary" icon={<Icon name="diagram-3-fill" />}>
              Primary — the matter moved to review.
            </Toast>
            <Toast tone="success" icon={<Icon name="check-lg" />}>
              Success — the entity was created.
            </Toast>
            <Toast tone="danger" icon={<Icon name="x-lg" />}>
              Danger — that could not be saved.
            </Toast>
            <Toast tone="warning" icon={<Icon name="shield-fill-check" />}>
              Warning — a retainer is outstanding.
            </Toast>
          </div>
        </Section>

        <Section
          title="Banners"
          note="Flash banners arrive with the document. The impersonation banner is a standing region, not an alert."
        >
          <div className="gallery__stack">
            <Flash tone="success">Entity created.</Flash>
            <Flash tone="danger">That email is already registered.</Flash>
            <ImpersonationBanner
              name={LAWYER.name}
              email={LAWYER.email}
              stopAction="#stop-impersonating"
            />
          </div>
        </Section>

        <Section title="Legal disclaimer">
          <LegalDisclaimer>
            Nothing on this page is legal advice, and reading it forms no attorney–client
            relationship.
          </LegalDisclaimer>
          <p />
          <Alert title="Standing note">An Alert with its own heading, not announced.</Alert>
        </Section>

        <Section
          title="Data table"
          note="Sort state lives in ?sort= — a JSON:API sort value, so a server that already speaks JSON:API reads the same parameter it always has — and paging in ?page=, both as real anchors. The table works with no client bundle."
        >
          <DataTable
            columns={COLUMNS}
            rows={PEOPLE}
            rowKey={(row) => row.id}
            caption="People on the matter"
            sort={{ key: 'name', direction: 'asc' }}
            sortHref={(key, direction) => `?sort=${serializeJsonApiSort([{ key, direction }])}`}
          />
          <Pagination page={2} totalPages={5} pageHref={(page) => `?page=${page}`} />
        </Section>

        <Section title="Empty table">
          <DataTable
            columns={COLUMNS}
            rows={[]}
            rowKey={(row) => row.id}
            empty="Nobody has been added to this matter yet."
          />
        </Section>

        <Section
          title="Confirm delete"
          note="A native <dialog> carrying role=alertdialog — the focus trap, the Esc key, and the inert background come from the platform."
        >
          <NavButton variant="danger" onClick={() => setConfirming(true)}>
            Delete {LAWYER.name}
          </NavButton>
          <ConfirmDelete
            open={confirming}
            title="Delete this person?"
            message={`${LAWYER.name} will be removed from the matter. This cannot be undone.`}
            action="#delete"
            onCancel={() => setConfirming(false)}
          />
        </Section>

        <Section title="Form">
          <FormCard
            title="New person"
            intro="Everyone who should see the matter."
            error="Two fields need attention."
            notice="Approved records cannot be edited."
            onSubmit={(event) => event.preventDefault()}
          >
            <TextField
              label="Full name"
              name="name"
              required
              defaultValue={LAWYER.name}
              help="As it appears on the engagement letter."
            />
            <TextField
              label="Email"
              name="email"
              defaultValue={`${LAWYER.email.split('@')[0]}@`}
              error="Enter a valid email address."
            />
            <TextField label="Monthly fee" name="fee" addon="$" defaultValue="4500" />
            <SelectField
              label="State"
              name="state"
              placeholder="Choose a state"
              options={[
                { value: 'nv', label: 'Nevada' },
                { value: 'ca', label: 'California' },
              ]}
            />
            <TextareaField label="Summary" name="summary" rows={3} defaultValue="A paragraph is plenty." />
            <CheckboxField label="Send the welcome email" name="welcome" defaultChecked />
            <RadioGroup
              legend="Role on the matter"
              name="role"
              defaultValue="lead"
              choices={[
                { value: 'lead', label: 'Lead counsel' },
                { value: 'support', label: 'Supporting' },
                { value: 'conflicted', label: 'Conflicted', locked: true, note: 'Waiver outstanding.' },
              ]}
            />
            <PeopleList
              legend="Who should receive it?"
              name="recipients"
              people={PEOPLE}
              defaultSelected={['1']}
            />
            <NavButton variant="primary" type="submit">
              Save
            </NavButton>
          </FormCard>
        </Section>

        <Section title="Empty people list">
          <FormCard onSubmit={(event) => event.preventDefault()}>
            <PeopleList legend="Who should receive it?" name="recipients" people={[]} />
          </FormCard>
        </Section>

        <Section
          title="Notation outline"
          note="The numbered outline sits beside its review checklist."
        >
          <HarvardOutlineViewer
            sections={GENERATED_NOTATION}
            aria-label="Generated notation outline"
            scrollMode="page"
          />
          <ol aria-label="Notation checklist">
            {GENERATED_NOTATION_CHECKLIST.map((step) => (
              <li key={step.id}>
                <label>
                  <input type="checkbox" defaultChecked={step.checked} />
                  {step.title}{step.detail ? ` — ${step.detail}` : ''}
                </label>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Harvard outline"
          note="The rail is the document's own numbering — Roman, then letter, then Arabic — and it tracks the unit in view as the reader moves down. j/k and the arrow keys step when the navigator has focus. The specimen is an invented motion; the quotes open the record."
        >
          <HarvardOutlineViewer sections={MOTION_SECTIONS} aria-label="Sample motion outline" />
        </Section>

        <Section
          title="Cite the record"
          note="Every direct quote the brief already committed to. Selecting one marks those words in the excerpt they came from. A paraphrase does not light up — that is the point of the locator."
        >
          <CiteTheRecord citations={RECORD_CITATIONS} />
        </Section>

        <Section title="Navigation">
          <Breadcrumb
            items={[
              { label: 'Projects', href: '#projects' },
              { label: 'Acme', href: '#acme' },
              { label: 'Retainer' },
            ]}
          />
          <p>
            An external link opens in a new tab with the OWASP rel pair and says so:{' '}
            <ExternalLink href="https://www.courtlistener.com/">CourtListener</ExternalLink>.
          </p>
        </Section>

        <Section
          title="Prose"
          note="Marketing copy arrives as runs — plain text with the emphasized phrases marked — so the emphasis survives translation."
        >
          <Prose
            paragraphs={[
              [
                { text: 'We represent clients in litigation and handle transactional work on a ' },
                { text: 'flat fee', style: 'strong' },
                { text: ', monthly, or contingency basis.' },
              ],
              [
                { text: 'A quoted identifier takes the monospace face: ' },
                { text: 'CGC-25-626923', style: 'code' },
                { text: '. Our ' },
                { text: 'engagement terms', style: 'emphasis', href: '#terms' },
                { text: ' explain the rest.' },
              ],
            ]}
          />
        </Section>

        <Section
          title="Public chrome"
          note="The live header of this site is the gallery's own destinations. The specimen below is the marketing header a consuming app would ship — framed so it does not take over the page."
        >
          <div className="gallery__frame">
            <SiteHeader brand="Neon Law" links={NAV_LINKS} utility={[{ label: 'Sign in', href: '#signin' }]} />
            <SiteFooter
              cta={{ label: 'Book a call', href: '#book' }}
              phone={{ label: '(702) 555-0100', href: 'tel:+17025550100' }}
              links={[
                { label: 'Team', href: '#team' },
                { label: 'Blog', href: '#blog' },
                { label: 'Contact', href: '#contact' },
              ]}
              offices={[
                { label: 'Nevada', address: '123 Main Street, Las Vegas, NV 89101' },
                {
                  label: 'California',
                  address: '456 Market Street, San Francisco, CA 94105',
                  note: 'Admission pending.',
                },
              ]}
              legal={<p>This page is a specimen, not legal advice.</p>}
            />
          </div>
        </Section>

        <Section
          title="Authenticated chrome"
          note="The same bar renders the client, staff, and admin forms — it takes its destinations and never learns what a role is. The mark beside the wordmark is the resolved brand's own logo; the wordmark itself stays Navigator."
        >
          <div className="gallery__frame">
            <NavigatorShell
              header={
                <NavigatorNavbar
                  brand="Navigator"
                  logo={brand ? <BrandMark brand={brand} /> : undefined}
                  destinations={[
                    { label: 'Matters', href: '#matters', current: true },
                    { label: 'People', href: '#people' },
                    { label: 'Entities', href: '#entities' },
                  ]}
                  signOut={{ action: '#sign-out' }}
                />
              }
              footer={
                <NavigatorFooter
                  legal="© 2026 Shook Law PLLC"
                  brands={navigatorBrandLinks(brandId)}
                  links={[{ label: 'Support', href: '#support' }]}
                  release="v0.5.0"
                />
              }
            >
              <PageHeader title="Matters" summary="Everything open right now." />
              <Card header="CGC-25-626923">
                <p>The authenticated frame, framed as a specimen.</p>
              </Card>
            </NavigatorShell>
          </div>
        </Section>

        <Section
          title="Brand editor"
          note="A gallery/dev-tool composition (ENG-594) for authoring a layer-2 brand override, not a runtime portal surface — see docs/brand-theming.md. Synthetic state only; nothing here calls an API."
        >
          <div className="gallery__frame">
            <BrandEditorPanel />
          </div>
        </Section>

        {/* Everything past here is beyond the Dioxus surface — see the file. */}
        <SectionGroup name="shadcn set">
          <ShadcnSet Section={Section} />
        </SectionGroup>

        <SectionGroup name="Second wave">
          <ShadcnWaveTwo Section={Section} />
        </SectionGroup>

        <SectionGroup name="One thing at a time">
          <FocusSet Section={Section} />
        </SectionGroup>

        <SectionGroup name="Copilot">
          <ChatSet Section={Section} />
        </SectionGroup>
      </ComponentPages>
      </GalleryFrame>
  )
}
