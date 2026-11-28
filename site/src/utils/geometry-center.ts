import type { Geometry, Position } from 'geojson'

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

/** Pin for events whose stored shape is a geofence; null without usable coordinates. */
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
