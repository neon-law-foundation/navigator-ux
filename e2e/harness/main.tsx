import '../../src/styles/fonts.css'
import '../../src/styles/theme.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { parseGalleryLocation, galleryBase } from '../../gallery/routes'
import { NeonSite } from '../../gallery/neon-site'
import { App } from './App'
import { ShortcutsDemo } from './ShortcutsDemo'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')

const location = parseGalleryLocation(window.location.pathname, window.location.search, galleryBase())

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === '/shortcuts-demo' ? (
      <ShortcutsDemo />
    ) : window.location.pathname !== '/api-demo' && location.view === 'neon' ? (
      <NeonSite />
    ) : (
      <App />
    )}
  </StrictMode>,
)
