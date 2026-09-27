import abhayaLogo from './brands/marks/abhaya.svg?url'
import cyberLogo from './brands/marks/cyber-injury-law.svg?url'
import daybridgeLogo from './brands/marks/daybridge.svg?url'
import deathLogo from './brands/marks/death-and-divorce.svg?url'
import deleteYourDataLogo from './brands/marks/delete-your-data.svg?url'
import deleteYourDebtLogo from './brands/marks/delete-your-debt.svg?url'
import lawyerShookLogo from './brands/marks/lawyer-shook.svg?url'
import misericordiaLogo from './brands/marks/misericordia.svg?url'
import neonLogo from './brands/marks/neon-law.svg?url'
import summonsLogo from './brands/marks/summons.svg?url'
import vestaLogo from './brands/marks/vesta.svg?url'

import abhayaSheet from './brands/abhaya.css?inline'
import cyberSheet from './brands/cyber-injury-law.css?inline'
import daybridgeSheet from './brands/daybridge.css?inline'
import deathSheet from './brands/death-and-divorce.css?inline'
import deleteYourDataSheet from './brands/delete-your-data.css?inline'
import deleteYourDebtSheet from './brands/delete-your-debt.css?inline'
import lawyerShookSheet from './brands/lawyer-shook.css?inline'
import misericordiaSheet from './brands/misericordia.css?inline'
import summonsSheet from './brands/summons.css?inline'
import vestaSheet from './brands/vesta.css?inline'

/*
 * The compiled brands the gallery can wear. Neon Law is the library default
 * (no extra sheet — GORP is named in the stack and not shipped). Each other
 * entry is a `:root:root` layer plus self-hosted `@font-face` rules — the
 * same shape an app copies. Order matches the family on lawyershook.com,
 * with Lawyer Shook last because that site is the family, not a card in it.
 *
 * Sheets are inlined rather than loaded as `<link href>` because Vite's
 * `?url` in the gallery dev server points at a JS module, which a stylesheet
 * link cannot apply. Marks are the sites' own SVG.
 */

export const DEFAULT_BRAND_ID = 'neon-law'

export const GALLERY_BRANDS = [
  {
    id: DEFAULT_BRAND_ID,
    label: 'Neon Law',
    sheet: null,
    logo: neonLogo,
    displayClass: 'gallery-face--neon',
    bodyClass: 'gallery-face--neon',
    face: 'GORP Serif',
  },
  {
    id: 'abhaya',
    label: 'Abhaya Immigration',
    sheet: abhayaSheet,
    logo: abhayaLogo,
    displayClass: 'gallery-face--mukta',
    bodyClass: 'gallery-face--mukta',
    face: 'Mukta',
  },
  {
    id: 'cyber-injury-law',
    label: 'CyberInjuryLaw',
    sheet: cyberSheet,
    logo: cyberLogo,
    displayClass: 'gallery-face--barlow',
    bodyClass: 'gallery-face--dm-sans',
    face: 'Barlow Condensed and DM Sans',
  },
  {
    id: 'daybridge',
    label: 'Daybridge Divorce Law',
    sheet: daybridgeSheet,
    logo: daybridgeLogo,
    displayClass: 'gallery-face--source-serif',
    bodyClass: 'gallery-face--source-serif',
    face: 'Source Serif 4',
  },
  {
    id: 'death-and-divorce',
    label: 'Death & Divorce',
    sheet: deathSheet,
    logo: deathLogo,
    displayClass: 'gallery-face--pirata',
    bodyClass: 'gallery-face--pirata',
    face: 'Pirata One',
  },
  {
    id: 'delete-your-data',
    label: 'DeleteYourData.com',
    sheet: deleteYourDataSheet,
    logo: deleteYourDataLogo,
    displayClass: 'gallery-face--jakarta',
    bodyClass: 'gallery-face--jakarta',
    face: 'Plus Jakarta Sans',
  },
  {
    id: 'delete-your-debt',
    label: 'DeleteYourDebt.com',
    sheet: deleteYourDebtSheet,
    logo: deleteYourDebtLogo,
    displayClass: 'gallery-face--public-sans',
    bodyClass: 'gallery-face--public-sans',
    face: 'Public Sans',
  },
  {
    id: 'misericordia',
    label: 'Misericordia Injury Law',
    sheet: misericordiaSheet,
    logo: misericordiaLogo,
    displayClass: 'gallery-face--source-serif',
    bodyClass: 'gallery-face--source-sans',
    face: 'Source Serif 4 and Source Sans 3',
  },
  {
    id: 'summons',
    label: 'Summons Defense',
    sheet: summonsSheet,
    logo: summonsLogo,
    displayClass: 'gallery-face--franklin',
    bodyClass: 'gallery-face--franklin',
    face: 'Libre Franklin',
  },
  {
    id: 'vesta',
    label: 'Vesta Estate Planning',
    sheet: vestaSheet,
    logo: vestaLogo,
    displayClass: 'gallery-face--garamond',
    bodyClass: 'gallery-face--garamond',
    face: 'EB Garamond',
  },
  {
    id: 'lawyer-shook',
    label: 'Lawyer Shook',
    sheet: lawyerShookSheet,
    logo: lawyerShookLogo,
    displayClass: 'gallery-face--tinos',
    bodyClass: 'gallery-face--tinos',
    face: 'Tinos',
  },
] as const

export type GalleryBrand = (typeof GALLERY_BRANDS)[number]
export type GalleryBrandId = GalleryBrand['id']

const IDS = new Set<string>(GALLERY_BRANDS.map((brand) => brand.id))

export function isGalleryBrandId(value: string | null): value is GalleryBrandId {
  return value !== null && IDS.has(value)
}
