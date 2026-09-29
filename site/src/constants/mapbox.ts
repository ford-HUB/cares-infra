import { CEBU_PROVINCE_BOUNDS, DEFAULT_MAP_CENTER } from './event'

/**
 * Public (`pk.`) Mapbox token. It is shipped to the browser, so it must be a
 * public token scoped to the styles/tiles/geocoding scopes — never a `sk.` one.
 */
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

const MAPBOX_GEOCODING_BASE_URL = 'https://api.mapbox.com/search/geocode/v6'
const MAPBOX_SEARCHBOX_BASE_URL = 'https://api.mapbox.com/search/searchbox/v1'

/**
 * Feature types requested from the Search Box API. `poi` is what surfaces named
 * venues such as universities — the plain Geocoding API only knows addresses.
 */
const MAPBOX_AUTOCOMPLETE_TYPES = 'poi,address,street,place'

/** Mapbox style used for the basemap. */
export const MAPBOX_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12'

/**
 * Layer in {@link MAPBOX_MAP_STYLE} that carries building footprints. Queried at
 * a clicked point to auto-trace the venue outline.
 */
export const MAPBOX_BUILDING_LAYER = 'building'

/** How many address suggestions to request from the geocoding endpoint. */
export const MAPBOX_AUTOCOMPLETE_LIMIT = 5

/** Debounce applied to the address input before hitting the geocoding API. */
export const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 350

/** Minimum characters typed before requesting suggestions. */
export const ADDRESS_AUTOCOMPLETE_MIN_CHARS = 3

/**
 * Rough outline of Cebu province — the main island plus Mactan, Bantayan and the
 * Camotes group — as `[lng, lat]` pairs, buffered a few km out to sea. Search
 * results are boxed to {@link CEBU_PROVINCE_BOUNDS}, but that rectangle also
 * clips the Bohol and Negros coasts; this polygon keeps only Cebu.
 */
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
 * (~2 hectares). Anything that big would count people far outside the venue as
 * attending, so oversized traces are replaced by a circle around the place.
 */
export const MAX_AUTO_TRACE_AREA_SQM = 20_000

/** Radius of the fallback circular geofence when no usable footprint is found. */
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
