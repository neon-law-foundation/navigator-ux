import { useEffect } from 'react'

import { BrandMark } from './brand-mark'
import { GALLERY_BRANDS } from './brands'
import { brandHref, readBrandId } from './routes'

const LAYER_ID = 'gallery-brand-layer'

/**
 * Attaches the selected brand layer as a stylesheet. Detaching it returns the
 * page to the library identity. The scheme still follows the OS.
 */
export function BrandSwitch() {
  const selected = readBrandId()

  useEffect(() => {
    const brand = GALLERY_BRANDS.find((entry) => entry.id === selected)
    const existing = document.getElementById(LAYER_ID)
    if (!brand?.sheet) {
      existing?.remove()
      return
    }
    const style = existing instanceof HTMLStyleElement ? existing : document.createElement('style')
    style.id = LAYER_ID
    style.textContent = brand.sheet
    if (!existing) document.head.append(style)
  }, [selected])

  return (
    <nav className="gallery-brand-switch" aria-label="Brand layer">
      {GALLERY_BRANDS.map((brand) => (
        <a
          key={brand.id}
          className={
            brand.id === selected
              ? 'gallery-brand-switch__link is-current'
              : 'gallery-brand-switch__link'
          }
          href={brandHref(brand.id)}
          aria-current={brand.id === selected ? true : undefined}
        >
          <BrandMark brand={brand} />
          {brand.label}
        </a>
      ))}
    </nav>
  )
}
