import { useState, type ComponentType, type ReactNode } from 'react'

import { CFO, CLIENT, LAWYER } from '../fixtures/matter.mjs'
import {
  Accordion,
  AspectRatio,
  Avatar,
  Card,
  Collapsible,
  Combobox,
  Dialog,
  DropdownMenu,
  Icon,
  LinkTabs,
  NavButton,
  Popover,
  Progress,
  Separator,
  Sheet,
  Skeleton,
  Switch,
  Tabs,
  Toaster,
  ToggleGroup,
  Tooltip,
  useToasts,
} from '../src/index'

/*
 * The shadcn-derived set, illustrated.
 *
 * Split out of `Gallery.tsx` because it is a distinct claim: everything here is
 * a *superset* of the Dioxus surface. Nothing here has a counterpart in the legacy static surface, so
 * none of it can be checked against a reference rendering the way the rest of
 * the gallery can. What it can be checked against is the token contract.
 */

interface SectionProps {
  title: string
  note?: ReactNode
  children: ReactNode
}

export function ShadcnSet({ Section }: { Section: ComponentType<SectionProps> }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [notify, setNotify] = useState(true)
  const { toasts, toast, dismiss } = useToasts()

  return (
    <>
      <Section
        title="Beyond the reference surface"
        note={
          <>
            Everything below is shadcn/ui, rebuilt on the platform primitive that already carries
            its semantics and styled in the same tokens. No Tailwind, no Radix, no runtime
            dependency. None of it has a counterpart in the legacy static surface.
          </>
        }
      >
        <Separator />
      </Section>

      <Section
        title="Accordion"
        note="<details> and <summary>. The browser owns the state, the ARIA, and the keyboard — and it participates in in-page find, so Ctrl+F opens the section containing the match."
      >
        <Accordion
          exclusive
          items={[
            {
              id: 'scope',
              trigger: 'What is covered',
              children: <p>Company counsel work on a flat monthly fee.</p>,
              defaultOpen: true,
            },
            {
              id: 'fees',
              trigger: 'How fees work',
              children: <p>Billed monthly in advance. No hourly billing, no surprises.</p>,
            },
            {
              id: 'conflicts',
              trigger: 'Conflicts',
              children: <p>We run a conflicts check before the engagement letter goes out.</p>,
            },
          ]}
        />
        <p />
        <Collapsible trigger="A single disclosure">
          <p>The accordion&rsquo;s one-item case, named for what it is.</p>
        </Collapsible>
      </Section>

      <Section
        title="Tabs"
        note="Two forms. LinkTabs puts the view in the URL so it survives a refresh and needs no client bundle; Tabs is the client-side one, with the APG keyboard contract."
      >
        <LinkTabs
          aria-label="Matter views"
          tabs={[
            { label: 'Open', href: '#tabs-open', current: true },
            { label: 'Closed', href: '#tabs-closed' },
            { label: 'All', href: '#tabs' },
          ]}
        />
        <p />
        <Tabs
          aria-label="Matter sections"
          items={[
            { value: 'summary', label: 'Summary', children: <p>Try the arrow keys, Home, and End.</p> },
            { value: 'filings', label: 'Filings', children: <p>Focus travels with selection.</p> },
            {
              value: 'archive',
              label: 'Archive',
              children: <p>Unreachable.</p>,
              disabled: true,
            },
          ]}
        />
      </Section>

      <Section title="Avatar, Separator, and AspectRatio">
        <div className="gallery__row">
          <Avatar name={LAWYER.name} size="sm" />
          <Avatar name={CLIENT.name} />
          <Avatar name={CFO.name} size="lg" />
          <Separator orientation="vertical" />
          <Avatar name="Custom Initials" initials="PS" size="lg" />
        </div>
        <p />
        <div style={{ maxWidth: '20rem' }}>
          <AspectRatio ratio={16 / 9}>
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                background: 'var(--nav-color-surface-subtle)',
                color: 'var(--nav-color-primary-active)',
              }}
            >
              16 : 9
            </div>
          </AspectRatio>
        </div>
      </Section>

      <Section
        title="Skeleton and Progress"
        note="The skeleton is silent to assistive technology unless labelled; the indeterminate bar reports no position, because it does not have one."
      >
        <div className="gallery__row">
          <Skeleton circle width="2.5rem" height="2.5rem" />
          <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
            <Skeleton width="60%" />
            <Skeleton width="90%" />
          </div>
        </div>
        <p />
        <div className="gallery__stack">
          <Progress value={72} label="Document upload" showValue />
          <Progress label="Running the conflicts check" />
        </div>
      </Section>

      <Section
        title="Switch and ToggleGroup"
        note="The switch is a real checkbox carrying role=switch, so it posts and works with no JavaScript. The toggle group is buttons with aria-pressed, because it filters a view rather than submitting a choice."
      >
        <Switch
          label="Email me when a filing lands"
          description="Sent to the address on the engagement letter."
          checked={notify}
          onChange={(event) => setNotify(event.currentTarget.checked)}
        />
        <p />
        <ToggleGroup
          label="Filter matters"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'archived', label: 'Archived', disabled: true },
          ]}
        />
      </Section>

      <Section
        title="Combobox"
        note="<input list> plus <datalist> — the platform's own combobox. Suggestions over a free-text field, so a value that is not on the list is still accepted."
      >
        <Combobox
          label="State of formation"
          name="state"
          options={['Nevada', 'Delaware', 'California', 'New York', 'Wyoming']}
          help="Type to filter, or enter something else."
        />
      </Section>

      <Section
        title="Dialog and Sheet"
        note="Both native <dialog>: the focus trap, the top layer, the inert background, and Esc all come from the platform."
      >
        <div className="gallery__row">
          <NavButton variant="primary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </NavButton>
          <NavButton variant="outline" onClick={() => setSheetOpen(true)}>
            Open sheet
          </NavButton>
        </div>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Assign the matter"
          description="Whoever you pick receives the file and the calendar."
          footer={
            <>
              <NavButton variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </NavButton>
              <NavButton variant="primary" onClick={() => setDialogOpen(false)}>
                Assign
              </NavButton>
            </>
          }
        >
          <p>Try Esc, and try tabbing — focus cannot leave the dialog.</p>
        </Dialog>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          side="right"
          title="Filters"
          description="Narrow the matter list."
        >
          <Switch label="Only mine" />
          <p />
          <Switch label="Only overdue" />
        </Sheet>
      </Section>

      <Section
        title="Popover, DropdownMenu, and Tooltip"
        note="Esc closes, an outside click closes, and focus returns to the trigger — written once as a shared hook and used by all three."
      >
        <div className="gallery__row">
          <Popover trigger="Matter details" label="Matter details">
            <p style={{ margin: 0 }}>
              <strong>CGC-25-626923</strong>
              <br />
              Filed 12 August 2026.
            </p>
          </Popover>

          <DropdownMenu
            trigger="Actions"
            label="Matter actions"
            items={[
              { label: 'Open', href: '#shadcn-set' },
              {
                label: 'Assign',
                onSelect: () => toast(`Assigned to ${LAWYER.name}`, { tone: 'success' }),
              },
              { label: 'Archive', disabled: true },
              {
                label: 'Delete',
                destructive: true,
                onSelect: () => toast('That would have deleted the matter', { tone: 'danger' }),
              },
            ]}
          />

          <Tooltip content="Removes the matter from the active list without deleting it.">
            <NavButton variant="outline">
              <Icon name="eye" /> Hover or focus me
            </NavButton>
          </Tooltip>
        </div>
      </Section>

      <Section
        title="Toaster"
        note="The region is mounted empty and always present — a role=alert element that appears from nothing is missed by several screen readers."
      >
        <div className="gallery__row">
          <NavButton variant="primary" onClick={() => toast('The entity was created', { tone: 'success' })}>
            Raise a toast
          </NavButton>
          <NavButton
            variant="outline"
            onClick={() => toast('This one stays until dismissed', { tone: 'warning', duration: 0 })}
          >
            Raise a sticky one
          </NavButton>
        </div>
        <Toaster toasts={toasts} onDismiss={dismiss} />
      </Section>

      <Section title="Composed">
        <Card header="Everything at once">
          <div className="gallery__row">
            <Avatar name={LAWYER.name} />
            <div style={{ flex: 1 }}>
              <strong>{LAWYER.name}</strong>
              <br />
              <span className="nav-text-muted">General Counsel, Acme</span>
            </div>
            <Tooltip content="Matter is on track.">
              <span>
                <Icon name="shield-fill-check" title="On track" />
              </span>
            </Tooltip>
            <DropdownMenu
              trigger="…"
              label="Row actions"
              align="end"
              items={[
                { label: 'View', href: '#composed' },
                { label: 'Remove', destructive: true, onSelect: () => toast('Removed') },
              ]}
            />
          </div>
          <Separator />
          <Progress value={40} label="Onboarding" showValue />
        </Card>
      </Section>
    </>
  )
}
