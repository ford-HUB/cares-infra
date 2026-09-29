import type { Geometry, MultiPolygon, Polygon } from 'geojson'

/** Normalised address suggestion used across the app. */
export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
}

/** One named level of a Mapbox Geocoding v6 result's address context. */
interface MapboxContextEntry {
  name?: string
}

/** Raw feature from the Mapbox Search Box `forward` and Geocoding v6 `reverse` endpoints. */
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

/** A place resolved from a clicked point, including the building footprint when available. */
export interface PlaceDetails {
  label: string
  lat: number
  lng: number
  geometry: Polygon | MultiPolygon | null
}

/** Candidate footprint geometries read off the map at the clicked point. */
export type FootprintCandidate = Geometry | null | undefined
