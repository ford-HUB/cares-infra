import type { Geometry, MultiPolygon, Polygon } from 'geojson'

export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
}

interface MapboxContextEntry {
  name?: string
}

/** Search Box `forward` and Geocoding v6 `reverse`. */
export interface MapboxGeocodingFeature {
  id: string
  properties: {
    mapbox_id: string
    feature_type?: string
    name?: string
    name_preferred?: string
    full_address?: string
    place_formatted?: string
    coordinates: { longitude: number; latitude: number }
    context?: {
      address?: MapboxContextEntry
      street?: MapboxContextEntry
      neighborhood?: MapboxContextEntry
      locality?: MapboxContextEntry
      place?: MapboxContextEntry
      district?: MapboxContextEntry
      region?: MapboxContextEntry
    }
  }
}

export interface MapboxGeocodingResponse {
  features?: MapboxGeocodingFeature[]
}

export interface PlaceDetails {
  label: string
  lat: number
  lng: number
  geometry: Polygon | MultiPolygon | null
}

export type FootprintCandidate = Geometry | null | undefined
