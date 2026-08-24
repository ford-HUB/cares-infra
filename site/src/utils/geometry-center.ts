import type { Geometry, Position } from 'geojson'

/**
 * Flatten any geometry down to the raw coordinate list it is built from.
 * Geometry collections recurse; unknown types yield nothing.
 */
function collectPositions(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates]
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat()
    case 'MultiPolygon':
      return geometry.coordinates.flat(2)
    case 'GeometryCollection':
      return geometry.geometries.flatMap(collectPositions)
    default:
      return []
  }
}

/**
 * Average coordinate of a geometry, used to drop a single map pin for an event
 * whose stored shape is the drawn attendance geofence rather than a point.
 * Returns null when the geometry carries no usable coordinate.
 */
export function geometryCenter(geometry: Geometry | null | undefined): [number, number] | null {
  if (!geometry) return null

  const positions = collectPositions(geometry).filter(
    ([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat),
  )
  if (positions.length === 0) return null

  const lng = positions.reduce((sum, [value]) => sum + value, 0) / positions.length
  const lat = positions.reduce((sum, [, value]) => sum + value, 0) / positions.length
  return [lng, lat]
}
