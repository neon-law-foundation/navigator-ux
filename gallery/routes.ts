/*
 * Gallery addresses: the view is the path, filters stay on the query.
 *
 *   /                              public-site home
 *   /components                    components landing (brand tokens)
 *   /components/<id>               one component, or `all`
 *   /pages                         sample-page index
 *   /pages/<id>                    one sample page
 *   /councils                      the two councils
 *   /design                        house brands, and table/form widths
 *   /neon                          public-site specimen (home)
 *   /neon/<id>                     a public-site page
 *   ?brand=<id>                    brand layer (omitted for Neon Law)
 *   ?sku=<id>                      checkout product on a neon page
 *
 * Legacy query-only URLs (`?showcase=`, `?component=`, `?id=`) still parse so
 * existing bookmarks resolve. Canonical hrefs are always path + query.
 * GitHub Pages has no rewrite rule, so the Pages build copies index.html to
 * 404.html and the SPA reads the original pathname.
 */

import { DEFAULT_BRAND_ID, isGalleryBrandId, type GalleryBrandId } from './brands'

export type GalleryView = 'components' | 'home' | 'councils' | 'page' | 'neon' | 'design'

export interface GalleryLocation {
  view: GalleryView
  componentId: string
  pageId: string | null
  sku: string | null
  q?: string
  brand: GalleryBrandId
}

const LANDING_COMPONENT = 'brand-tokens'

export function galleryBase() {
  return import.meta.env.BASE_URL || '/'
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function pathAfterBase(pathname: string, base: string) {
  const prefix = base === '/' ? '' : base.endsWith('/') ? base.slice(0, -1) : base
  let path = pathname
  if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) {
    path = path.slice(prefix.length) || '/'
  }
  return path.split('/').filter(Boolean).map(decodeSegment)
}

function joinBase(path: string, base: string) {
  const prefix = base === '/' ? '' : base.endsWith('/') ? base.slice(0, -1) : base
  if (path === '/') return prefix ? `${prefix}/` : '/'
  return `${prefix}${path}`
}

function parseBrand(params: URLSearchParams): GalleryBrandId {
  const brand = params.get('brand')
  return isGalleryBrandId(brand) ? brand : DEFAULT_BRAND_ID
}

function parseLegacy(params: URLSearchParams): Omit<GalleryLocation, 'brand'> | null {
  const showcase = params.get('showcase')
  const component = params.get('component')
  const id = params.get('id')
  const sku = params.get('sku')
  if (showcase === 'councils') {
    return { view: 'councils', componentId: LANDING_COMPONENT, pageId: null, sku: null }
  }
  if (showcase === 'neon') {
    return { view: 'neon', componentId: LANDING_COMPONENT, pageId: id ?? 'home', sku }
  }
  if (showcase === 'page' && id) {
    return { view: 'page', componentId: LANDING_COMPONENT, pageId: id, sku: null }
  }
  if (showcase) {
    return { view: 'home', componentId: LANDING_COMPONENT, pageId: null, sku: null }
  }
  if (component) {
    return { view: 'components', componentId: component, pageId: null, sku: null }
  }
  return null
}

/** Pure parse: path names the view; leftover query fills in legacy addresses. */
export function parseGalleryLocation(pathname: string, search: string, base: string): GalleryLocation {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const brand = parseBrand(params)
  const sku = params.get('sku')
  const q = params.get('q')
  const segments = pathAfterBase(pathname, base)
  const head = segments[0]
  const rest = segments[1]

  if (head === 'components') {
    return { view: 'components', componentId: rest ?? LANDING_COMPONENT, pageId: null, sku: null, brand }
  }
  if (head === 'pages') {
    return rest
      ? { view: 'page', componentId: LANDING_COMPONENT, pageId: rest, sku: null, brand }
      : { view: 'home', componentId: LANDING_COMPONENT, pageId: null, sku: null, brand }
  }
  if (head === 'councils') {
    return { view: 'councils', componentId: LANDING_COMPONENT, pageId: null, sku: null, brand }
  }
  if (head === 'design') {
    return { view: 'design', componentId: LANDING_COMPONENT, pageId: null, sku: null, brand }
  }
  if (head === 'neon') {
    return {
      view: 'neon',
      componentId: LANDING_COMPONENT,
      pageId: rest ?? 'home',
      sku,
      brand,
      ...(rest === 'services' && q ? { q } : {}),
    }
  }

  const legacy = parseLegacy(params)
  if (legacy) {
    return {
      ...legacy,
      brand,
      ...(legacy.view === 'neon' && legacy.pageId === 'services' && q ? { q } : {}),
    }
  }
  return { view: 'neon', componentId: LANDING_COMPONENT, pageId: 'home', sku: null, brand }
}

function queryString(location: GalleryLocation) {
  const params = new URLSearchParams()
  if (location.brand !== DEFAULT_BRAND_ID) params.set('brand', location.brand)
  if (location.view === 'neon' && location.sku) params.set('sku', location.sku)
  if (location.view === 'neon' && location.pageId === 'services' && location.q) params.set('q', location.q)
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Pure format: path + `?brand=` / `?sku=` when those filters are set. */
export function formatGalleryHref(location: GalleryLocation, base: string): string {
  let path = '/'
  if (location.view === 'components') {
    path = location.componentId === LANDING_COMPONENT ? '/components' : `/components/${encodeURIComponent(location.componentId)}`
  } else if (location.view === 'home') {
    path = '/pages'
  } else if (location.view === 'page' && location.pageId) {
    path = `/pages/${encodeURIComponent(location.pageId)}`
  } else if (location.view === 'councils') {
    path = '/councils'
  } else if (location.view === 'design') {
    path = '/design'
  } else if (location.view === 'neon') {
    path = location.pageId && location.pageId !== 'home' ? `/neon/${encodeURIComponent(location.pageId)}` : '/'
  }

  return `${joinBase(path, base)}${queryString(location)}`
}

export function canonicalizeGalleryHref(pathname: string, search: string, base: string): string {
  return formatGalleryHref(parseGalleryLocation(pathname, search, base), base)
}

function currentLocation(): GalleryLocation {
  if (typeof window === 'undefined') {
    return {
      view: 'components',
      componentId: LANDING_COMPONENT,
      pageId: null,
      sku: null,
      brand: DEFAULT_BRAND_ID,
    }
  }
  return parseGalleryLocation(window.location.pathname, window.location.search, galleryBase())
}

function hrefFor(patch: Partial<GalleryLocation>) {
  return formatGalleryHref({ ...currentLocation(), ...patch }, galleryBase())
}

/** Components landing, keeping the current brand layer. */
export function componentsHref() {
  return hrefFor({ view: 'components', componentId: LANDING_COMPONENT, pageId: null, sku: null })
}

export function designHref() {
  return hrefFor({ view: 'design', pageId: null, componentId: LANDING_COMPONENT, sku: null })
}

export function pageHref(view: Exclude<GalleryView, 'components' | 'neon' | 'design'>, id?: string) {
  if (view === 'page' && id) {
    return hrefFor({ view: 'page', pageId: id, componentId: LANDING_COMPONENT, sku: null })
  }
  if (view === 'councils') {
    return hrefFor({ view: 'councils', pageId: null, componentId: LANDING_COMPONENT, sku: null })
  }
  return hrefFor({ view: 'home', pageId: null, componentId: LANDING_COMPONENT, sku: null })
}

/** A public-site specimen: home, services, a door page, or checkout. */
export function neonHref(id: string, sku?: string) {
  return hrefFor({
    view: 'neon',
    pageId: id,
    sku: sku ?? null,
    q: undefined,
    componentId: LANDING_COMPONENT,
  })
}

/** Service search uses the same GET `q` a live /services can take. */
export function neonFindHref(query: string) {
  return hrefFor({
    view: 'neon',
    pageId: 'services',
    sku: null,
    componentId: LANDING_COMPONENT,
    q: query,
  })
}

/** One component's own page. The first one is the components landing itself. */
export function componentHref(id: string) {
  return hrefFor({ view: 'components', componentId: id, pageId: null, sku: null })
}

export function brandHref(id: GalleryBrandId) {
  return hrefFor({ brand: id })
}

export function readComponentId(): string {
  return currentLocation().componentId
}

export function readBrandId(): GalleryBrandId {
  return currentLocation().brand
}

export function readGalleryLocation(): Pick<GalleryLocation, 'view' | 'pageId' | 'sku' | 'q'> {
  const { view, pageId, sku, q } = currentLocation()
  return { view, pageId, sku, q }
}

/** Rewrite query-only bookmarks to path + query before the tree mounts. */
export function replaceLegacyGalleryUrl() {
  if (typeof window === 'undefined') return
  const next = canonicalizeGalleryHref(window.location.pathname, window.location.search, galleryBase())
  const current = `${window.location.pathname}${window.location.search}`
  if (next !== current) window.history.replaceState(null, '', next)
}
