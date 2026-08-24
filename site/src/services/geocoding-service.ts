import area from '@turf/area'
import {
  ADDRESS_AUTOCOMPLETE_MIN_CHARS,
  ALLOWED_UNIVERSITY_NAMES,
  CEBU_METRO_ALLOWED_AREAS,
  CEBU_METRO_EXCLUDED_AREAS,
  GEOAPIFY_API_KEY,
  MAX_AUTO_TRACE_AREA_SQM,
  UNIVERSITY_KEYWORDS,
  geoapifyAutocompleteUrl,
  geoapifyPlaceDetailsUrl,
} from '../constants/geoapify'
import type {
  AddressSuggestion,
  GeoapifyPlaceDetailsFeature,
  GeoapifyAutocompleteResponse,
  GeoapifyAutocompleteResult,
  GeoapifyPlaceDetailsResponse,
  PlaceDetails,
} from '../types/geocoding'

/**
 * Decide whether a suggestion should appear:
 * - University/college results: only "University of Cebu" branches (incl. the
 *   Lapu-Lapu and Mandaue campus); every other university is hidden.
 * - Other places: must sit in an allowed Metro Cebu municipality and not in an
 *   excluded area (e.g. Lapu-Lapu City / Mactan).
 */
function isAllowedSuggestion(r: GeoapifyAutocompleteResult): boolean {
  const haystack = [
    r.name,
    r.address_line1,
    r.city,
    r.county,
    r.municipality,
    r.district,
    r.suburb,
    r.formatted,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const isUniversity = UNIVERSITY_KEYWORDS.some((k) => haystack.includes(k))
  if (isUniversity) {
    return ALLOWED_UNIVERSITY_NAMES.some((name) => haystack.includes(name))
  }

  if (CEBU_METRO_EXCLUDED_AREAS.some((area) => haystack.includes(area))) return false
  return CEBU_METRO_ALLOWED_AREAS.some((area) => haystack.includes(area))
}

/**
 * Fetch address suggestions from Geoapify for the given query.
 * Returns an empty list on missing key, short query, aborted requests, or errors.
 */
export async function autocompleteAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const text = query.trim()
  if (!GEOAPIFY_API_KEY || text.length < ADDRESS_AUTOCOMPLETE_MIN_CHARS) {
    return []
  }

  try {
    const res = await fetch(geoapifyAutocompleteUrl(text), { signal })
    if (!res.ok) return []
    const data: GeoapifyAutocompleteResponse = await res.json()
    return (data.results ?? [])
      .filter((r) => typeof r.lat === 'number' && typeof r.lon === 'number')
      .filter(isAllowedSuggestion)
      .map((r) => ({
        id: r.place_id,
        label: r.formatted,
        lat: r.lat,
        lng: r.lon,
      }))
  } catch {
    return []
  }
}

/**
 * Pick the tightest usable footprint from a place-details response: the smallest
 * polygon that still fits {@link MAX_AUTO_TRACE_AREA_SQM}. Geoapify returns both
 * the building and the surrounding campus/landuse polygon, and only the building
 * makes sense as an attendance boundary.
 */
function pickFootprint(
  features: GeoapifyPlaceDetailsFeature[],
): GeoapifyPlaceDetailsFeature | undefined {
  return features
    .filter(
      (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
    )
    .map((f) => ({
      feature: f,
      areaSqM: area({ type: 'Feature', geometry: f.geometry!, properties: {} }),
    }))
    .filter(({ areaSqM }) => areaSqM > 0 && areaSqM <= MAX_AUTO_TRACE_AREA_SQM)
    .sort((a, b) => a.areaSqM - b.areaSqM)[0]?.feature
}

/**
 * Resolve the place (and its building footprint, when available) at the given
 * coordinates via Geoapify Place Details. Returns null on error or no result.
 */
export async function getPlaceDetails(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PlaceDetails | null> {
  if (!GEOAPIFY_API_KEY) return null

  try {
    const res = await fetch(geoapifyPlaceDetailsUrl(lat, lng), { signal })
    if (!res.ok) return null
    const data: GeoapifyPlaceDetailsResponse = await res.json()
    const features = data.features ?? []
    if (features.length === 0) return null

    const withPolygon = pickFootprint(features)
    const props = withPolygon?.properties ?? features[0].properties
    const label = props?.formatted ?? features[0].properties?.formatted ?? ''
    if (!label) return null

    return {
      label,
      lat: props?.lat ?? lat,
      lng: props?.lon ?? lng,
      geometry:
        withPolygon?.geometry?.type === 'Polygon' ||
        withPolygon?.geometry?.type === 'MultiPolygon'
          ? withPolygon.geometry
          : null,
    }
  } catch {
    return null
  }
}
