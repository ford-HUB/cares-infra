import { DEFAULT_MAP_CENTER } from './event'

export const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined

const GEOAPIFY_API_BASE_URL = 'https://api.geoapify.com'
const GEOAPIFY_TILE_BASE_URL = 'https://maps.geoapify.com/v1/tile'

/** Geoapify map style used for the raster basemap (MapLibre/Mapbox GL compatible). */
const GEOAPIFY_TILE_STYLE = 'osm-bright'

/** How many address suggestions to request from the autocomplete endpoint. */
export const GEOAPIFY_AUTOCOMPLETE_LIMIT = 5

/** Debounce applied to the address input before hitting the geocoding API. */
export const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 350

/** Minimum characters typed before requesting suggestions. */
export const ADDRESS_AUTOCOMPLETE_MIN_CHARS = 3

/**
 * Bounding box (mainland Metro Cebu) used to restrict autocomplete results:
 * roughly Cebu City → Mandaue → Consolacion → Liloan. Excludes far-north Cebu
 * and the far south. `[minLng, minLat, maxLng, maxLat]`.
 */
export const CEBU_METRO_BOUNDS = {
  minLng: 123.78,
  minLat: 10.28,
  maxLng: 124.05,
  maxLat: 10.43,
} as const

/**
 * Municipalities/cities allowed for event addresses. Matched against a result's
 * city/county/formatted fields. Edit to widen or narrow the coverage.
 */
export const CEBU_METRO_ALLOWED_AREAS = [
  'cebu city',
  'mandaue',
  'consolacion',
  'liloan',
] as const

/** Areas explicitly excluded even if they fall inside the bounding box (e.g. Mactan). */
export const CEBU_METRO_EXCLUDED_AREAS = ['lapu-lapu', 'lapu lapu', 'mactan'] as const

/** Keywords that mark a result as a higher-education institution. */
export const UNIVERSITY_KEYWORDS = [
  'university',
  'college',
  'institute',
  'polytechnic',
  'academy',
] as const

/**
 * The only universities allowed to appear (matched against the result name).
 * Covers every "University of Cebu" branch, e.g. the Lapu-Lapu and Mandaue campus.
 */
export const ALLOWED_UNIVERSITY_NAMES = ['university of cebu'] as const

/**
 * Largest auto-traced footprint accepted as an event geofence, in square metres
 * (~2 hectares). Geoapify often returns the whole campus/landuse polygon for a
 * university; anything that big would count people far outside the venue as
 * attending, so oversized traces are replaced by a circle around the place.
 */
export const MAX_AUTO_TRACE_AREA_SQM = 20_000

/** Radius of the fallback circular geofence when no usable footprint is found. */
export const FALLBACK_GEOFENCE_RADIUS_M = 60

export function geoapifyAutocompleteUrl(query: string): string {
  const { minLng, minLat, maxLng, maxLat } = CEBU_METRO_BOUNDS
  const url = new URL(`${GEOAPIFY_API_BASE_URL}/v1/geocode/autocomplete`)
  url.searchParams.set('text', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(GEOAPIFY_AUTOCOMPLETE_LIMIT))
  url.searchParams.set('filter', `rect:${minLng},${minLat},${maxLng},${maxLat}`)
  url.searchParams.set('bias', `proximity:${DEFAULT_MAP_CENTER[0]},${DEFAULT_MAP_CENTER[1]}`)
  url.searchParams.set('apiKey', GEOAPIFY_API_KEY ?? '')
  return url.toString()
}

export function geoapifyRasterTileUrl(): string {
  return `${GEOAPIFY_TILE_BASE_URL}/${GEOAPIFY_TILE_STYLE}/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY ?? ''}`
}

export function geoapifyPlaceDetailsUrl(lat: number, lng: number): string {
  const url = new URL(`${GEOAPIFY_API_BASE_URL}/v2/place-details`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  // `building` returns the footprint polygon, `details` the address of the place.
  url.searchParams.set('features', 'details,building')
  url.searchParams.set('apiKey', GEOAPIFY_API_KEY ?? '')
  return url.toString()
}
