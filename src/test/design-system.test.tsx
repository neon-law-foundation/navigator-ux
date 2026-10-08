import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakePerson } from '../../fixtures/fake.mjs'
import { Icon, ICON_NAMES } from '../components/Icon'
import {
  Card,
  PricingCard,
  PricingGrid,
  TestimonialCard,
  TestimonialSection,
} from '../components/Surfaces'
import {
  Alert,
  Flash,
  ImpersonationBanner,
  LegalDisclaimer,
  Toast,
} from '../components/Feedback'
import {
  Breadcrumb,
  ExternalLink,
  NavBadge,
  NavButton,
  NavLinkButton,
} from '../components/Navigation'

/* One person, drawn once: a testimonial's author and the impersonated user. */
const WITNESS = fakePerson('design-system/person')
import { Prose, Runs } from '../components/Prose'

describe('Icon', () => {
  it('renders every named glyph with at least one path', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')
      expect(svg, name).not.toBeNull()
      expect(svg?.querySelectorAll('path').length, name).toBeGreaterThan(0)
      unmount()
    }
  })

  it('hides itself from assistive technology when it has no title', () => {
    const { container } = render(<Icon name="eye" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('aria-label')
  })

  it('takes an accessible name instead of hiding, when given one', () => {
    render(<Icon name="trash3-fill" title="Delete" />)
    expect(screen.getByRole('img', { name: 'Delete' })).toBeInTheDocument()
  })

  it('sizes at 1em so it inherits the surrounding text', () => {
    const { container } = render(<Icon name="star-fill" className="extra" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '1em')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveClass('nav-icon', 'extra')
  })
})

describe('Card', () => {
  it('renders a body-only card', () => {
    const { container } = render(<Card>Body</Card>)
    expect(container.querySelector('.nav-card__header')).toBeNull()
    expect(container.querySelector('.nav-card__footer')).toBeNull()
    expect(container.querySelector('.nav-card__body')).toHaveTextContent('Body')
  })

  it('keeps the no-icon card markup byte-identical to the plain surface', () => {
    const { container } = render(<Card>Body</Card>)
    expect(container.innerHTML).toBe('<section class="nav-card"><div class="nav-card__body">Body</div></section>')
  })

  it('renders an icon as decoration while the content keeps its accessible name', () => {
    render(
      <Card icon="handshake">
        <h2>Business plan</h2>
      </Card>,
    )
    expect(document.querySelector('.nav-card__icon')).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('.nav-card__icon svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('heading', { name: 'Business plan' })).toBeInTheDocument()
  })

  it('renders a header and footer when given them', () => {
    const { container } = render(
      <Card header="Head" footer="Foot" id="c1" className="extra">
        Body
      </Card>,
    )
    expect(container.querySelector('.nav-card__header')).toHaveTextContent('Head')
    expect(container.querySelector('.nav-card__footer')).toHaveTextContent('Foot')
    expect(container.querySelector('.nav-card')).toHaveClass('extra')
    expect(container.querySelector('#c1')).not.toBeNull()
  })

  it('sets a description under the title, with or without one', () => {
    const { container, rerender } = render(
      <Card header="Head" description="Muted line">
        Body
      </Card>,
    )
    const header = container.querySelector('.nav-card__header')
    expect(header).toHaveTextContent('Head')
    expect(header?.querySelector('.nav-card__description')).toHaveTextContent('Muted line')

    rerender(<Card description="Alone">Body</Card>)
    expect(container.querySelector('.nav-card__header .nav-card__description')).toHaveTextContent('Alone')

    rerender(<Card header="Head">Body</Card>)
    expect(container.querySelector('.nav-card__description')).toBeNull()
  })

  it('carries the brand anchor and the centered body as modifiers', () => {
    const { container } = render(
      <Card highlighted centered header="Recommended">
        Body
      </Card>,
    )
    expect(container.querySelector('.nav-card')).toHaveClass('nav-card--highlighted')
    expect(container.querySelector('.nav-card__body')).toHaveClass('nav-card__body--center')
  })
})

describe('PricingCard', () => {
  it('renders the full plan', () => {
    const { container } = render(
      <PricingCard
        name="Company counsel"
        amount="$4,500"
        period="per month"
        summary="Everything a company needs."
        features={['Unlimited calls', 'Contract review']}
        cta={{ label: 'Get started', href: '/start' }}
        recommended
      />,
    )

    expect(container.querySelector('.pricing-card__band')).toHaveTextContent('Company counsel')
    expect(container.querySelector('.nav-card')).toHaveClass('nav-card--highlighted')
    expect(screen.getByText('$4,500')).toBeInTheDocument()
    expect(screen.getByText('per month')).toBeInTheDocument()
    expect(screen.getByText('Everything a company needs.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/start')
  })

  it('omits every optional part and stays a card', () => {
    const { container } = render(<PricingCard name="Free" amount="$0" />)

    expect(container.querySelector('.pricing-card__band')).toBeNull()
    expect(container.querySelector('.nav-card__header')).toHaveTextContent('Free')
    expect(container.querySelector('.pricing-card__features')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('drives its column count through a custom property', () => {
    const { container } = render(
      <PricingGrid columns={2}>
        <PricingCard name="A" amount="$1" />
      </PricingGrid>,
    )
    expect(container.querySelector('.pricing-grid')).toHaveStyle({ '--pricing-cols': '2' })
  })

  it('leaves the column count to the stylesheet by default', () => {
    const { container } = render(<PricingGrid>none</PricingGrid>)
    expect(container.querySelector('.pricing-grid')?.getAttribute('style')).toBeNull()
  })
})

describe('TestimonialCard', () => {
  it('uses the portrait when there is one, decoratively', () => {
    const { container } = render(
      <TestimonialCard quote="They won." name={WITNESS.name} avatarUrl="/portrait.jpg" />,
    )
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/portrait.jpg')
    // The name sits beside it; alt text would be the same words twice.
    expect(img).toHaveAttribute('alt', '')
  })

  it('derives initials when there is no portrait', () => {
    const { container } = render(<TestimonialCard quote="Good." name={WITNESS.name} />)
    expect(container.querySelector('.testimonial-card__avatar--initials')).toHaveTextContent(
      WITNESS.initials,
    )
  })

  it('prefers explicit initials over derived ones', () => {
    const { container } = render(
      <TestimonialCard quote="Good." name={WITNESS.name} initials="DQ" />,
    )
    expect(container.querySelector('.testimonial-card__avatar--initials')).toHaveTextContent('DQ')
  })

  it('derives nothing from a non-string name', () => {
    const { container } = render(
      <TestimonialCard quote="Good." name={<span>{WITNESS.firstName}</span>} />,
    )
    expect(container.querySelector('.testimonial-card__avatar--initials')).toHaveTextContent('')
  })

  it('renders the label and role lines only when supplied', () => {
    const { container, unmount } = render(
      <TestimonialCard quote="Q" name="N" label="Litigation" title="GC, Acme" />,
    )
    expect(container.querySelector('.testimonial-card__label')).toHaveTextContent('Litigation')
    expect(screen.getByText('GC, Acme')).toBeInTheDocument()
    unmount()

    const bare = render(<TestimonialCard quote="Q" name="N" />)
    expect(bare.container.querySelector('.testimonial-card__label')).toBeNull()
  })

  it('wraps a grid with an optional heading and intro', () => {
    const { container, unmount } = render(
      <TestimonialSection heading="What clients say" intro="A few of them.">
        <TestimonialCard quote="Q" name="N" />
      </TestimonialSection>,
    )
    expect(screen.getByRole('heading', { name: 'What clients say' })).toBeInTheDocument()
    expect(screen.getByText('A few of them.')).toBeInTheDocument()
    expect(container.querySelector('.testimonial-grid')).not.toBeNull()
    unmount()

    const bare = render(
      <TestimonialSection>
        <TestimonialCard quote="Q" name="N" />
      </TestimonialSection>,
    )
    expect(bare.container.querySelector('.testimonial-section__head')).toBeNull()
  })
})

describe('Feedback', () => {
  it.each(['primary', 'success', 'danger', 'warning'] as const)(
    'renders the %s toast as an alert',
    (tone) => {
      const { container } = render(<Toast tone={tone}>Saved.</Toast>)
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass(`nav-toast--${tone}`)
      expect(container.querySelector('.nav-toast__body')).toHaveTextContent('Saved.')
    },
  )

  it('defaults to the primary tone and takes an icon and an action', () => {
    render(
      <Toast icon={<Icon name="check-lg" />} action={<button type="button">Dismiss</button>}>
        Done.
      </Toast>,
    )
    expect(screen.getByRole('alert')).toHaveClass('nav-toast--primary')
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('renders a flash banner as an alert', () => {
    render(<Flash tone="success">Entity created.</Flash>)
    const flash = screen.getByRole('alert')
    expect(flash).toHaveClass('nav-flash', 'nav-flash--success')
  })

  it('names the disclaimer region so it can be found', () => {
    render(<LegalDisclaimer>Not legal advice.</LegalDisclaimer>)
    expect(screen.getByRole('heading', { name: 'Legal notice' })).toBeInTheDocument()
    expect(screen.getByText('Not legal advice.')).toBeInTheDocument()
  })

  it('falls back to a generic label when the note has no heading', () => {
    render(<Alert>Standing text.</Alert>)
    expect(screen.getByRole('region', { name: 'Notice' })).toBeInTheDocument()
  })

  it('announces the note only when asked to', () => {
    render(<Alert title="Heads up" live>Something changed.</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something changed.')
  })
})

describe('ImpersonationBanner', () => {
  it('is a status region, not an alert', () => {
    render(<ImpersonationBanner name={WITNESS.name} stopAction="/impersonation/stop" />)
    // A standing condition is announced politely, once — not asserted over
    // whatever the reader is doing.
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(`You are acting as ${WITNESS.name}`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers the way out as a form post, with its hidden fields', () => {
    const { container } = render(
      <ImpersonationBanner
        name={WITNESS.firstName}
        email={WITNESS.email}
        stopAction="/impersonation/stop"
        stopLabel="Return to my account"
        hiddenFields={{ _csrf: 'tok' }}
      />,
    )

    const form = container.querySelector('form')
    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/impersonation/stop')
    expect(container.querySelector('input[name="_csrf"]')).toHaveValue('tok')
    expect(screen.getByRole('button', { name: 'Return to my account' })).toHaveAttribute(
      'type',
      'submit',
    )
    expect(screen.getByText(WITNESS.email)).toBeInTheDocument()
  })
})

describe('Navigation', () => {
  it('defaults a button to type=button so it cannot submit by accident', () => {
    render(<NavButton>Save</NavButton>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it.each(['primary', 'secondary', 'outline', 'danger'] as const)('carries the %s variant', (variant) => {
    render(<NavButton variant={variant}>Go</NavButton>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('nav-btn', `nav-btn--${variant}`)
  })

  it('renders an unvariant button and link with the base class only', () => {
    render(
      <>
        <NavButton className="x">Plain</NavButton>
        <NavLinkButton href="/a">Link</NavLinkButton>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Plain' }).className).toBe('nav-btn x')
    expect(screen.getByRole('link', { name: 'Link' }).className).toBe('nav-btn')
  })

  it('styles a link as a button without making it stop being a link', () => {
    render(
      <NavLinkButton variant="primary" href="/start">
        Start
      </NavLinkButton>,
    )
    const link = screen.getByRole('link', { name: 'Start' })
    expect(link).toHaveAttribute('href', '/start')
    expect(link).toHaveClass('nav-btn--primary')
  })

  it('renders a badge', () => {
    render(<NavBadge>Approved</NavBadge>)
    expect(screen.getByText('Approved')).toHaveClass('nav-badge')
  })
})

describe('Breadcrumb', () => {
  it('links every ancestor and marks the current page as text', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'Acme', href: '/projects/acme' },
          { label: 'Retainer' },
        ]}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getAllByRole('link')).toHaveLength(2)
    // The page you are on is not a link to itself.
    expect(screen.getByText('Retainer')).toHaveAttribute('aria-current', 'page')
  })

  it('keys a non-string label without throwing', () => {
    render(<Breadcrumb items={[{ label: <em>Home</em>, href: '/' }]} aria-label="Trail" />)
    expect(screen.getByRole('navigation', { name: 'Trail' })).toBeInTheDocument()
  })
})

describe('ExternalLink', () => {
  it('opens in a new tab with the OWASP rel pair', () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('announces the new tab through the trailing glyph', () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>)
    expect(screen.getByRole('img', { name: 'opens in a new tab' })).toBeInTheDocument()
  })

  it('can drop the glyph where the surrounding text already says so', () => {
    render(
      <ExternalLink href="https://example.com" hideGlyph>
        Example
      </ExternalLink>,
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('Prose', () => {
  it('renders each run style with its own element', () => {
    const { container } = render(
      <Runs
        runs={[
          { text: 'plain ' },
          { text: 'emphasized ', style: 'emphasis' },
          { text: 'strong ', style: 'strong' },
          { text: 'code', style: 'code' },
        ]}
      />,
    )

    expect(container.querySelector('em')).toHaveTextContent('emphasized')
    expect(container.querySelector('strong')).toHaveTextContent('strong')
    expect(container.querySelector('code')).toHaveClass('nav-code')
    expect(container).toHaveTextContent('plain emphasized strong code')
  })

  it('honors an explicit plain style', () => {
    const { container } = render(<Runs runs={[{ text: 'flat', style: 'plain' }]} />)
    expect(container.querySelector('em')).toBeNull()
    expect(container).toHaveTextContent('flat')
  })

  it('turns a run into a link when it carries an href', () => {
    render(<Runs runs={[{ text: 'our terms', style: 'emphasis', href: '/terms' }]} />)
    const link = screen.getByRole('link', { name: 'our terms' })
    expect(link).toHaveAttribute('href', '/terms')
    expect(link.querySelector('em')).not.toBeNull()
  })

  it('renders one paragraph per run list', () => {
    const { container } = render(
      <Prose
        className="lead"
        paragraphs={[[{ text: 'First.' }], [{ text: 'Second.', style: 'strong' }]]}
      />,
    )
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(container.firstElementChild).toHaveClass('lead')
  })

  it('keys an empty paragraph by index rather than crashing', () => {
    const { container } = render(<Prose paragraphs={[[]]} />)
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})
