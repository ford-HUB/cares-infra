import type { MultiPolygon, Polygon, Position } from 'geojson'

const EARTH_RADIUS_M = 6_378_137
const CIRCLE_STEPS = 32

/**
 * Build a small circular polygon (approximated with {@link CIRCLE_STEPS} points)
 * centred on the given coordinate. Used as the attendance geofence when no
 * building footprint is available, or when the traced footprint is too large to
 * be a useful check-in boundary.
 */
export function circlePolygon(lng: number, lat: number, radiusM: number): Polygon {
  const latRad = (lat * Math.PI) / 180
  const dLat = ((radiusM / EARTH_RADIUS_M) * 180) / Math.PI
  const dLng = dLat / Math.max(Math.cos(latRad), 1e-6)

  const ring: [number, number][] = []
  for (let i = 0; i < CIRCLE_STEPS; i += 1) {
    const angle = (i / CIRCLE_STEPS) * 2 * Math.PI
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)])
  }
  ring.push(ring[0])

  return { type: 'Polygon', coordinates: [ring] }
}

/**
 * Grow (factor > 1) or shrink (factor < 1) a polygon around its own centre,
 * keeping its shape. Lets an operator widen an auto-traced footprint until it
 * covers the whole venue without redrawing it by hand.
 */
export function scalePolygon<T extends Polygon | MultiPolygon>(geometry: T, factor: number): T {
  const rings: Position[][] =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flat()

  const points = rings.flat()
  if (points.length === 0) return geometry

  const centreLng = points.reduce((sum, [lng]) => sum + lng, 0) / points.length
  const centreLat = points.reduce((sum, [, lat]) => sum + lat, 0) / points.length

  const scalePoint = ([lng, lat]: Position): Position => [
    centreLng + (lng - centreLng) * factor,
    centreLat + (lat - centreLat) * factor,
  ]

  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: geometry.coordinates.map((r) => r.map(scalePoint)) }
  }
  return {
    ...geometry,
    coordinates: geometry.coordinates.map((poly) => poly.map((r) => r.map(scalePoint))),
  }
}

/** Every linear ring of a polygon geometry, flattened into one list. */
export function polygonRings(geometry: Polygon | MultiPolygon): Position[][] {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
}

/**
 * Rebuild `geometry` from rings in the order {@link polygonRings} produced them,
 * restoring the original polygon/ring nesting for a MultiPolygon.
 */
export function withPolygonRings<T extends Polygon | MultiPolygon>(
  geometry: T,
  rings: Position[][],
): T {
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: rings }

  let offset = 0
  const coordinates = geometry.coordinates.map((poly) => {
    const next = rings.slice(offset, offset + poly.length)
    offset += poly.length
    return next
  })
  return { ...geometry, coordinates }
}

/**
 * Shift one edge of a polygon — the segment starting at `vertexIndex` of ring
 * `ringIndex` — by a lng/lat delta, moving both of its endpoints together. Lets an
 * operator push a whole side of the boundary in or out without touching corners.
 * Ring closure (first point repeated last) is preserved.
 */
export function translatePolygonEdge<T extends Polygon | MultiPolygon>(
  geometry: T,
  ringIndex: number,
  vertexIndex: number,
  deltaLng: number,
  deltaLat: number,
): T {
  const rings = polygonRings(geometry)
  const ring = rings[ringIndex]
  if (!ring) return geometry

  const last = ring[ring.length - 1]
  const closed = ring.length > 1 && ring[0][0] === last[0] && ring[0][1] === last[1]
  const open = closed ? ring.slice(0, -1) : ring.slice()
  if (open.length < 2) return geometry

  const a = vertexIndex % open.length
  const b = (vertexIndex + 1) % open.length
  const move = ([lng, lat]: Position): Position => [lng + deltaLng, lat + deltaLat]
  open[a] = move(open[a])
  open[b] = move(open[b])

  const nextRing = closed ? [...open, open[0]] : open
  return withPolygonRings(
    geometry,
    rings.map((r, i) => (i === ringIndex ? nextRing : r)),
  )
}

/**
 * Even-odd point-in-polygon test across every ring of the geometry, so holes and
 * the separate parts of a MultiPolygon are both handled.
 */
export function isPointInPolygon(
  geometry: Polygon | MultiPolygon,
  lng: number,
  lat: number,
): boolean {
  let inside = false
  for (const ring of polygonRings(geometry)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (crosses) inside = !inside
    }
  }
  return inside
}

/** Closest point to (lng, lat) on the segment a–b, in lng/lat space. */
function closestOnSegment(a: Position, b: Position, lng: number, lat: number): Position {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return [a[0], a[1]]
  const t = Math.max(0, Math.min(1, ((lng - a[0]) * dx + (lat - a[1]) * dy) / lengthSq))
  return [a[0] + t * dx, a[1] + t * dy]
}

/** How far inside the boundary a clamped point is pulled, as a share of the polygon's size. */
const CLAMP_INSET = 0.01

/**
 * Keep a point within the geofence: inside points are returned untouched, outside
 * ones snap to the nearest boundary point and are nudged slightly inwards so the
 * marker always sits within the area the operator drew.
 */
export function clampPointToPolygon(
  geometry: Polygon | MultiPolygon,
  lng: number,
  lat: number,
): Position {
  if (isPointInPolygon(geometry, lng, lat)) return [lng, lat]

  const points = polygonRings(geometry).flat()
  if (points.length === 0) return [lng, lat]

  let nearest: Position = [points[0][0], points[0][1]]
  let bestDistSq = Infinity
  for (const ring of polygonRings(geometry)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const candidate = closestOnSegment(ring[j], ring[i], lng, lat)
      const distSq = (candidate[0] - lng) ** 2 + (candidate[1] - lat) ** 2
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        nearest = candidate
      }
    }
  }

  const centreLng = points.reduce((sum, [x]) => sum + x, 0) / points.length
  const centreLat = points.reduce((sum, [, y]) => sum + y, 0) / points.length
  return [
    nearest[0] + (centreLng - nearest[0]) * CLAMP_INSET,
    nearest[1] + (centreLat - nearest[1]) * CLAMP_INSET,
  ]
}

/** Approximate distance in metres between two lng/lat points (haversine). */
export function metersBetween(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
