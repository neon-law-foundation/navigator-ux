import { useState } from 'react'

import {
  CheckboxField,
  DataTable,
  FormCard,
  NavButton,
  NavigatorFooter,
  NavigatorNavbar,
  NavigatorShell,
  PageHeader,
  SelectField,
  TextareaField,
  TextField,
  serializeJsonApiSort,
  type DataColumn,
} from '../src/index'
import { CFO, CLIENT, LAWYER } from '../fixtures/matter.mjs'
import { BrandMark } from './brand-mark'
import { navigatorBrandLinks } from './navigator-brands'
import { GALLERY_BRANDS } from './brands'
import { brandHref, readBrandId } from './routes'

/*
 * The live family shares one design catalog and restyles it per host.
 * This page puts the marks and faces together instead.
 */

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
]

const SORT = (key: string, direction: 'asc' | 'desc') =>
  `?sort=${serializeJsonApiSort([{ key, direction }])}`

function PeopleTable({ span }: { span?: 'full' }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={PEOPLE}
      rowKey={(row) => row.id}
      caption="People on the matter"
      sort={{ key: 'name', direction: 'asc' }}
      sortHref={SORT}
      span={span}
    />
  )
}

function PeopleForm({ span }: { span?: 'full' }) {
  const [sent, setSent] = useState(false)
  return (
    <FormCard
      title={sent ? 'Saved' : 'New person'}
      intro="Everyone who should see the matter."
      span={span}
      onSubmit={(event) => {
        event.preventDefault()
        setSent(true)
      }}
    >
      <TextField label="Full name" name="name" required defaultValue={LAWYER.name} />
      <TextField label="Email" name="email" defaultValue={LAWYER.email} />
      <SelectField
        label="State"
        name="state"
        placeholder="Choose a state"
        options={[
          { value: 'nv', label: 'Nevada' },
          { value: 'ny', label: 'New York' },
        ]}
      />
      <TextField label="Monthly fee" name="fee" addon="$" defaultValue="4500" />
      <TextareaField label="Summary" name="summary" rows={3} defaultValue="A paragraph is plenty." />
      <CheckboxField label="Send the welcome email" name="welcome" defaultChecked />
      <NavButton variant="primary" type="submit">
        Save
      </NavButton>
    </FormCard>
  )
}

export function DesignPage() {
  const selected = readBrandId()
  const current = GALLERY_BRANDS.find((brand) => brand.id === selected)
  if (!current) return null

  return (
    <>
      <h1>Design</h1>
      <p className="gallery__note">
        Every house mark and typeface, then the same table and form at the column measure and across
        the full width.
      </p>

      <section className="gallery__section" aria-labelledby="design-family">
        <h2 id="design-family">House brands</h2>
        <ul className="gallery-design__family">
          {GALLERY_BRANDS.map((brand) => (
            <li key={brand.id}>
              <a
                className={
                  brand.id === selected
                    ? 'gallery-design__brand is-current'
                    : 'gallery-design__brand'
                }
                href={brandHref(brand.id)}
                aria-current={brand.id === selected ? 'true' : undefined}
              >
                <BrandMark brand={brand} hero />
                <span className={`gallery-design__name ${brand.displayClass}`}>{brand.label}</span>
                <p className={`gallery-design__sample ${brand.bodyClass}`}>
                  A flat fee, written down before the work begins.
                </p>
                <p className="gallery-design__face">{brand.face}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="gallery__section" aria-labelledby="design-navigator">
        <h2 id="design-navigator">Navigator</h2>
        <div className="gallery__frame">
          <NavigatorShell
            header={
              <NavigatorNavbar
                brand="Navigator"
                logo={<BrandMark brand={current} />}
                destinations={[
                  { label: 'Matters', href: '#matters', current: true },
                  { label: 'People', href: '#people' },
                ]}
                signOut={{ action: '#sign-out' }}
              />
            }
            footer={
              <NavigatorFooter
                legal="© 2026 Shook Law PLLC"
                brands={navigatorBrandLinks(selected)}
                links={[{ label: 'Support', href: '#support' }]}
              />
            }
            showcase
          >
            <PageHeader title="Matters" summary="The mark beside Navigator is the brand in the switch." />
          </NavigatorShell>
        </div>
      </section>

      <section className="gallery__section" aria-labelledby="design-measure">
        <h2 id="design-measure">Column measure</h2>
        <div className="gallery-design__pair">
          <PeopleTable />
          <PeopleForm />
        </div>
      </section>

      <section className="gallery-bleed" aria-labelledby="design-full">
        <h2 id="design-full">Full width</h2>
        <div className="gallery-design__pair">
          <PeopleTable span="full" />
          <PeopleForm span="full" />
        </div>
      </section>
    </>
  )
}
