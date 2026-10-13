/** One linear ring of a geofence: `[lng, lat]` pairs, GeoJSON axis order. */
export type GeofenceRing = [number, number][];

/**
 * Flatten an event's stored `geojson` into its linear rings — every ring of
 * every polygon, holes included — so a client can run an even-odd
 * point-in-polygon test without a GeoJSON parser. Accepts the same shapes the
 * gps-validator-service does: a bare Polygon / MultiPolygon geometry, a
 * Feature wrapping one, or a FeatureCollection whose first polygon feature is
 * the fence. Returns null when there is no usable boundary.
 */
export function geofenceRings(geojson: unknown): GeofenceRing[] | null {
  const geometry = polygonGeometry(geojson);
  if (!geometry) return null;

  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : (geometry.coordinates as unknown[]);

  const rings: GeofenceRing[] = [];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) continue;
    for (const ring of polygon) {
      const points = toRing(ring);
      if (points.length >= 3) rings.push(points);
    }
  }
  return rings.length > 0 ? rings : null;
}

type PolygonLike = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown[] };

function polygonGeometry(value: unknown): PolygonLike | null {
  if (!value || typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;

  switch (node.type) {
    case 'Polygon':
    case 'MultiPolygon':
      return Array.isArray(node.coordinates) ? (node as PolygonLike) : null;
    case 'Feature':
      return polygonGeometry(node.geometry);
    case 'FeatureCollection': {
      const features = Array.isArray(node.features) ? node.features : [];
      for (const feature of features) {
        const geometry = polygonGeometry(feature);
        if (geometry) return geometry;
      }
      return null;
    }
    default:
      return null;
  }
}

function toRing(value: unknown): GeofenceRing {
  if (!Array.isArray(value)) return [];
  const ring: GeofenceRing = [];
  for (const point of value) {
    if (
      Array.isArray(point) &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number'
    ) {
      ring.push([point[0], point[1]]);
    }
  }
  return ring;
}
