import type { NavigatorFooterBrand } from '../src/components/Chrome'
import { BrandMark } from './brand-mark'
import { GALLERY_BRANDS, type GalleryBrandId } from './brands'
import { brandHref } from './routes'

/** Current brand first, then the rest of the family, each with its mark. */
export function navigatorBrandLinks(selected: GalleryBrandId): NavigatorFooterBrand[] {
  const ordered = [
    ...GALLERY_BRANDS.filter((brand) => brand.id === selected),
    ...GALLERY_BRANDS.filter((brand) => brand.id !== selected),
  ]
  return ordered.map((brand) => {
    const entry: NavigatorFooterBrand = {
      label: brand.label,
      logo: <BrandMark brand={brand} />,
      current: brand.id === selected,
    }
    if (brand.id !== selected) entry.href = brandHref(brand.id)
    return entry
  })
}
