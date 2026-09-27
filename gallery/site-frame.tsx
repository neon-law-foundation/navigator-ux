import type { ReactNode } from 'react'

import { SiteFooter, SiteHeader } from '../src/index'
import { BrandSwitch } from './BrandSwitch'
import { componentsHref, designHref, neonHref, pageHref, readGalleryLocation } from './routes'

/*
 * The GitHub Pages site is one site, not two: the component gallery and the
 * sample pages used to ship different bars (a marketing header on one, an
 * authenticated navbar on the other). This frame is the public chrome for
 * every view, so a reader can move from a component to a specimen without
 * losing the map.
 */

const LEGAL = <p>© 2026 Shook Law PLLC.</p>

export function GalleryFrame({ children }: { children: ReactNode }) {
  const { view, pageId } = readGalleryLocation()
  const onPages = view === 'home' || view === 'page' || (pageId !== null && view !== 'neon')

  return (
    <div className="public-shell nav-theme gallery-shell">
      <SiteHeader
        brand="Navigator UX"
        brandHref={componentsHref()}
        links={[
          { label: 'Components', href: componentsHref(), current: view === 'components' },
          { label: 'Design', href: designHref(), current: view === 'design' },
          { label: 'Sample pages', href: pageHref('home'), current: onPages },
          { label: 'Public site', href: neonHref('home'), current: view === 'neon' },
          { label: 'Councils', href: pageHref('councils'), current: view === 'councils' },
        ]}
        utility={[
          {
            label: 'Source',
            href: 'https://github.com/neon-law-source-code/navigator-ux',
            external: true,
          },
        ]}
      />
      <BrandSwitch />
      <main className="public-shell__main">{children}</main>
      <SiteFooter
        links={[
          { label: 'Components', href: componentsHref() },
          { label: 'Design', href: designHref() },
          { label: 'Sample pages', href: pageHref('home') },
          { label: 'Public site', href: neonHref('home') },
          { label: 'Councils', href: pageHref('councils') },
        ]}
        legal={LEGAL}
      />
    </div>
  )
}
