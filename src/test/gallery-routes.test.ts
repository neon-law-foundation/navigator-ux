import { describe, expect, it } from 'vitest'
import { canonicalizeGalleryHref, formatGalleryHref, parseGalleryLocation } from '../../gallery/routes'

const ROOT = '/'
const PAGES = '/navigator-ux/'

describe('parseGalleryLocation', () => {
  it('opens the public home at the root and keeps the component gallery addressable', () => {
    for (const base of [ROOT, PAGES]) {
      expect(parseGalleryLocation(base, '', base)).toMatchObject({ view: 'neon', pageId: 'home' })
      expect(canonicalizeGalleryHref(`${base}neon`, '', base)).toBe(base)
      expect(canonicalizeGalleryHref(`${base}components`, '', base)).toBe(`${base}components`)
      expect(parseGalleryLocation(`${base}components`, '', base).view).toBe('components')
    }
  })

  it('reads the view from the path and filters from the query', () => {
    expect(parseGalleryLocation('/components/buttons-and-badges', '?brand=delete-your-data', ROOT)).toEqual({
      view: 'components',
      componentId: 'buttons-and-badges',
      pageId: null,
      sku: null,
      brand: 'delete-your-data',
    })
    expect(parseGalleryLocation('/design', '?brand=abhaya', ROOT)).toEqual({
      view: 'design',
      componentId: 'brand-tokens',
      pageId: null,
      sku: null,
      brand: 'abhaya',
    })
    expect(parseGalleryLocation('/neon/checkout', '?sku=llc-launch&brand=lawyer-shook', ROOT)).toEqual({
      view: 'neon',
      componentId: 'brand-tokens',
      pageId: 'checkout',
      sku: 'llc-launch',
      brand: 'lawyer-shook',
    })
  })

  it('still understands the query-only bookmarks', () => {
    expect(parseGalleryLocation('/', '?showcase=home', ROOT).view).toBe('home')
    expect(parseGalleryLocation('/', '?showcase=neon&id=services', ROOT)).toMatchObject({
      view: 'neon',
      pageId: 'services',
    })
    expect(parseGalleryLocation('/', '?showcase=page&id=verify-the-record', ROOT).pageId).toBe(
      'verify-the-record',
    )
    expect(parseGalleryLocation('/', '?component=buttons-and-badges', ROOT).componentId).toBe(
      'buttons-and-badges',
    )
  })

  it('lets the path win when a leftover query names a different view', () => {
    expect(parseGalleryLocation('/councils', '?showcase=home&component=icons', ROOT).view).toBe('councils')
  })

  it('strips the GitHub Pages base', () => {
    expect(parseGalleryLocation('/navigator-ux/pages', '', PAGES).view).toBe('home')
    expect(parseGalleryLocation('/navigator-ux/neon', '', PAGES).pageId).toBe('home')
  })
})

describe('formatGalleryHref', () => {
  it('puts the view on the path and brand/sku on the query', () => {
    expect(
      formatGalleryHref(
        {
          view: 'components',
          componentId: 'buttons-and-badges',
          pageId: null,
          sku: null,
          brand: 'delete-your-data',
        },
        ROOT,
      ),
    ).toBe('/components/buttons-and-badges?brand=delete-your-data')
    expect(
      formatGalleryHref(
        {
          view: 'design',
          componentId: 'brand-tokens',
          pageId: null,
          sku: null,
          brand: 'vesta',
        },
        ROOT,
      ),
    ).toBe('/design?brand=vesta')
    expect(
      formatGalleryHref(
        {
          view: 'neon',
          componentId: 'brand-tokens',
          pageId: 'checkout',
          sku: 'llc-launch',
          brand: 'neon-law',
        },
        PAGES,
      ),
    ).toBe('/navigator-ux/neon/checkout?sku=llc-launch')
  })
})

describe('canonicalizeGalleryHref', () => {
  it('preserves catalog searches on canonical and legacy URLs under either base', () => {
    for (const base of [ROOT, PAGES]) {
      const expected = `${base}neon/services?brand=lawyer-shook&q=1501`
      expect(canonicalizeGalleryHref(`${base}neon/services`, '?brand=lawyer-shook&q=1501', base)).toBe(expected)
      expect(canonicalizeGalleryHref(base, '?showcase=neon&id=services&brand=lawyer-shook&q=1501', base)).toBe(expected)
    }
  })

  it('does not carry a catalog search into other views', () => {
    expect(canonicalizeGalleryHref('/neon/checkout', '?sku=nda&q=1501', ROOT)).toBe('/neon/checkout?sku=nda')
    expect(canonicalizeGalleryHref('/pages', '?q=1501', ROOT)).toBe('/pages')
  })

  it('rewrites a query-only bookmark to path + query', () => {
    expect(
      canonicalizeGalleryHref('/', '?showcase=neon&id=checkout&sku=llc-file&brand=delete-your-data', ROOT),
    ).toBe('/neon/checkout?brand=delete-your-data&sku=llc-file')
  })
})
