import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/fonts.css'
import './brands/faces.css'
import { Gallery } from './Gallery'
import { replaceLegacyGalleryUrl } from './routes'

/*
 * The gallery's entry point.
 *
 * It imports the library from `src`, not from `dist`, so a component edit shows
 * up without a build. That is the whole reason this exists as a Vite app rather
 * than a static page against the built CSS: the page you are looking at is the
 * components, not a transcription of them that can drift.
 *
 * The font layer is imported here, and only here. `theme.css` deliberately does
 * not `@import` it — Vite's *library* mode would inline the woff2 as base64 —
 * so a page that pulls in `src` gets the tokens, the components, and no
 * typeface. The gallery ran that way from the day the font was vendored: every
 * specimen on it was rendering in the `Georgia` fallback, which is precisely the
 * thing a specimen page must not do. Type looked settled because nobody could
 * see it was not.
 *
 * This import is safe because `vite.gallery.config.ts` is an ordinary app build,
 * where `assetsInlineLimit` is honored and a 20 KB woff2 is emitted as a file.
 * The library build never sees this module. Consumers are unaffected either way:
 * they get the font from the `@import` that `emit-font-layer.mjs` prepends.
 */

replaceLegacyGalleryUrl()

const root = document.getElementById('root')
if (!root) throw new Error('gallery: #root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
