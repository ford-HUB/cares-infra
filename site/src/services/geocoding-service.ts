import area from '@turf/area'
import { booleanPointInPolygon, point, polygon } from '@turf/turf'
import type { MultiPolygon, Polygon } from 'geojson'
import {
  ADDRESS_AUTOCOMPLETE_MIN_CHARS,
  ALLOWED_UNIVERSITY_NAMES,
  CEBU_PROVINCE_OUTLINE,
  MAPBOX_ACCESS_TOKEN,
  MAX_AUTO_TRACE_AREA_SQM,
  UNIVERSITY_KEYWORDS,
  mapboxAutocompleteUrl,
  mapboxReverseGeocodeUrl,
} from '../constants/mapbox'
import type {
  AddressSuggestion,
  FootprintCandidate,
  MapboxGeocodingFeature,
  MapboxGeocodingResponse,
  PlaceDetails,
} from '../types/geocoding'

const cebuProvince = polygon([[...CEBU_PROVINCE_OUTLINE, CEBU_PROVINCE_OUTLINE[0]]])

/**
 * Decide whether a suggestion should appear:
 * - Must lie anywhere in Cebu province (Cebu City, Mandaue, Lapu-Lapu, the
 *   north and south towns alike). Mapbox leaves `region` empty for Philippine
 *   addresses, so this is a geometric test rather than a name match.
 * - University/college results: only "University of Cebu" branches; every other
 *   university is hidden.
 */
function isAllowedSuggestion(f: MapboxGeocodingFeature): boolean {
  const { properties: p } = f
  const { longitude, latitude } = p.coordinates
  if (!booleanPointInPolygon(point([longitude, latitude]), cebuProvince)) return false

  const haystack = [p.name, p.name_preferred, p.full_address, p.place_formatted]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const isUniversity = UNIVERSITY_KEYWORDS.some((k) => haystack.includes(k))
  return !isUniversity || ALLOWED_UNIVERSITY_NAMES.some((name) => haystack.includes(name))
}

/**
 * Human-readable one-line label for a search feature. POIs carry the venue name
 * separately from the address, so it is prefixed when the address lacks it.
 */
function featureLabel(f: MapboxGeocodingFeature): string {
  const { name, full_address, place_formatted } = f.properties
  const address = full_address ?? place_formatted ?? ''
  if (!name) return address
  if (!address) return name
  return address.toLowerCase().includes(name.toLowerCase()) ? address : `${name}, ${address}`
}

/**
 * Fetch address suggestions from the Mapbox Search Box API for the given query.
 * Returns an empty list on missing token, short query, aborted requests, or errors.
 */
export async function autocompleteAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const text = query.trim()
  if (!MAPBOX_ACCESS_TOKEN || text.length < ADDRESS_AUTOCOMPLETE_MIN_CHARS) {
    return []
  }

  try {
    const res = await fetch(mapboxAutocompleteUrl(text), { signal })
    if (!res.ok) return []
    const data: MapboxGeocodingResponse = await res.json()
    return (data.features ?? [])
      .filter(
        (f) =>
          typeof f.properties?.coordinates?.latitude === 'number' &&
          typeof f.properties?.coordinates?.longitude === 'number',
      )
      .filter(isAllowedSuggestion)
      .map((f) => ({
        id: f.properties.mapbox_id ?? f.id,
        label: featureLabel(f),
        lat: f.properties.coordinates.latitude,
        lng: f.properties.coordinates.longitude,
      }))
  } catch {
    return []
  }
}

/**
 * Pick the tightest usable footprint from the candidates read off the map: the
 * smallest polygon that still fits {@link MAX_AUTO_TRACE_AREA_SQM}. Only a
 * building-sized outline makes sense as an attendance boundary.
 */
function pickFootprint(candidates: FootprintCandidate[]): Polygon | MultiPolygon | undefined {
  return candidates
    .filter(
      (g): g is Polygon | MultiPolygon =>
        g?.type === 'Polygon' || g?.type === 'MultiPolygon',
    )
    .map((geometry) => ({
      geometry,
      areaSqM: area({ type: 'Feature', geometry, properties: {} }),
    }))
    .filter(({ areaSqM }) => areaSqM > 0 && areaSqM <= MAX_AUTO_TRACE_AREA_SQM)
    .sort((a, b) => a.areaSqM - b.areaSqM)[0]?.geometry
}

/**
 * Resolve the place at the given coordinates via Mapbox reverse geocoding.
 * Mapbox's geocoder returns points only, so the building footprint comes from
 * `footprints` — geometries the caller read off the rendered map at that spot.
 * Returns null on error or no result.
 */
export async function getPlaceDetails(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  footprints: FootprintCandidate[] = [],
): Promise<PlaceDetails | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null

  try {
    const res = await fetch(mapboxReverseGeocodeUrl(lat, lng), { signal })
    if (!res.ok) return null
    const data: MapboxGeocodingResponse = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null

    const label = featureLabel(feature)
    if (!label) return null

    return {
      label,
      lat: feature.properties.coordinates?.latitude ?? lat,
      lng: feature.properties.coordinates?.longitude ?? lng,
      geometry: pickFootprint(footprints) ?? null,
    }
  } catch {
    return null
  }
}
