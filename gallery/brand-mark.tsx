import type { GalleryBrand } from './brands'

/** The resolved brand's mark. Decorative: the adjacent name is the label. */
export function BrandMark({ brand, hero = false }: { brand: GalleryBrand; hero?: boolean }) {
  return (
    <img
      className={hero ? 'gallery-mark gallery-mark--hero' : 'gallery-mark'}
      src={brand.logo}
      alt=""
    />
  )
}
