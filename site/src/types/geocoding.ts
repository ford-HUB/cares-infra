/** Normalised address suggestion used across the app. */
export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
}

/** Raw result item from the Geoapify geocoding autocomplete endpoint (format=json). */
export interface GeoapifyAutocompleteResult {
  place_id: string
  formatted: string
  lat: number
  lon: number
  name?: string
  address_line1?: string
  city?: string
  county?: string
  municipality?: string
  district?: string
  suburb?: string
  state?: string
}

export interface GeoapifyAutocompleteResponse {
  results?: GeoapifyAutocompleteResult[]
}

/** A place resolved from a clicked point, including the building footprint when available. */
export interface PlaceDetails {
  label: string
  lat: number
  lng: number
  geometry: import('geojson').Polygon | import('geojson').MultiPolygon | null
}

export interface GeoapifyPlaceDetailsFeature {
  properties?: {
    formatted?: string
    lat?: number
    lon?: number
    feature_type?: string
  }
  geometry?: import('geojson').Geometry
}

export interface GeoapifyPlaceDetailsResponse {
  features?: GeoapifyPlaceDetailsFeature[]
}
