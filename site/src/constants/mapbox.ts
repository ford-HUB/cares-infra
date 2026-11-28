import { CEBU_PROVINCE_BOUNDS, DEFAULT_MAP_CENTER } from './event'

/** Shipped to the browser: must be a public `pk.` token, never `sk.`. */
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

const MAPBOX_GEOCODING_BASE_URL = 'https://api.mapbox.com/search/geocode/v6'
const MAPBOX_SEARCHBOX_BASE_URL = 'https://api.mapbox.com/search/searchbox/v1'

/** `poi` surfaces named venues; plain Geocoding only knows addresses. */
const MAPBOX_AUTOCOMPLETE_TYPES = 'poi,address,street,place'

export const MAPBOX_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12'

/** Building footprints, queried at a click to auto-trace the venue. */
export const MAPBOX_BUILDING_LAYER = 'building'

export const MAPBOX_AUTOCOMPLETE_LIMIT = 5

export const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 350

export const ADDRESS_AUTOCOMPLETE_MIN_CHARS = 3

/** `[lng, lat]`, buffered out to sea; the bounds rectangle alone also clips Bohol and Negros coasts. */
export const CEBU_PROVINCE_OUTLINE: [number, number][] = [
  [123.55, 11.35], // Bantayan, north-west
  [124.1, 11.35], // Daanbantayan, north tip
  [124.1, 10.85],
  [124.5, 10.8], // Camotes, north-east
  [124.5, 10.5], // Camotes, south-east
  [124.12, 10.4],
  [124.12, 10.2], // Mactan / Cordova
  [123.95, 10.05],
  [123.75, 9.85], // Argao coast (Bohol lies east of here)
  [123.55, 9.6],
  [123.42, 9.35], // Santander, south tip
  [123.25, 9.4],
  [123.28, 9.75], // Badian / Moalboal coast
  [123.3, 10.05],
  [123.42, 10.25], // Pinamungajan (Negros lies west of here)
  [123.5, 10.4],
  [123.6, 10.6], // Balamban / Asturias
  [123.7, 10.9], // Tabuelan
  [123.55, 11.1],
]

export const UNIVERSITY_KEYWORDS = [
  'university',
  'college',
  'institute',
  'polytechnic',
  'academy',
] as const

/** Matched against the result name; covers every UC branch. */
export const ALLOWED_UNIVERSITY_NAMES = ['university of cebu'] as const

/** ~2 ha; larger traces would count people outside the venue, so fall back to a circle. */
export const MAX_AUTO_TRACE_AREA_SQM = 20_000

export const FALLBACK_GEOFENCE_RADIUS_M = 60

export function mapboxAutocompleteUrl(query: string): string {
  const [[minLng, minLat], [maxLng, maxLat]] = CEBU_PROVINCE_BOUNDS
  const url = new URL(`${MAPBOX_SEARCHBOX_BASE_URL}/forward`)
  url.searchParams.set('q', query)
  url.searchParams.set('types', MAPBOX_AUTOCOMPLETE_TYPES)
  url.searchParams.set('limit', String(MAPBOX_AUTOCOMPLETE_LIMIT))
  url.searchParams.set('country', 'ph')
  url.searchParams.set('bbox', `${minLng},${minLat},${maxLng},${maxLat}`)
  url.searchParams.set('proximity', `${DEFAULT_MAP_CENTER[0]},${DEFAULT_MAP_CENTER[1]}`)
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN ?? '')
  return url.toString()
}

export function mapboxReverseGeocodeUrl(lat: number, lng: number): string {
  const url = new URL(`${MAPBOX_GEOCODING_BASE_URL}/reverse`)
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('limit', '1')
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN ?? '')
  return url.toString()
}
