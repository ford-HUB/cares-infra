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

/** Cebu province by geometry (Mapbox leaves `region` empty for PH); universities limited to UC branches. */
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

/** POIs carry the venue name apart from the address, so prefix it when missing. */
function featureLabel(f: MapboxGeocodingFeature): string {
  const { name, full_address, place_formatted } = f.properties
  const address = full_address ?? place_formatted ?? ''
  if (!name) return address
  if (!address) return name
  return address.toLowerCase().includes(name.toLowerCase()) ? address : `${name}, ${address}`
}

/** Empty on missing token, short query, abort, or error. */
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

/** Smallest footprint within {@link MAX_AUTO_TRACE_AREA_SQM}. */
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

/** Geocoder returns points only, so footprints come from the caller's rendered map. Null on error. */
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
