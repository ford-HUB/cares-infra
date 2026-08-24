import area from '@turf/area'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { Geometry, MultiPolygon, Polygon } from 'geojson'
import mapboxgl from 'mapbox-gl'
import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_MAP_CENTER } from '../../../constants/event'
import {
  FALLBACK_GEOFENCE_RADIUS_M,
  GEOAPIFY_API_KEY,
  geoapifyRasterTileUrl,
} from '../../../constants/geoapify'
import { getPlaceDetails } from '../../../services/geocoding-service'
import type { PlaceDetails } from '../../../types/geocoding'
import { ConfirmBuildingModal } from './confirm-building-modal'
import {
  circlePolygon,
  clampPointToPolygon,
  metersBetween,
  polygonRings,
  scalePolygon,
  translatePolygonEdge,
} from '../../../utils/geofence-polygon'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface EventMapDrawProps {
  value?: Geometry | null
  /** When set, the map flies to this location and drops a marker. */
  focus?: { lng: number; lat: number } | null
  onChange: (geojson: Geometry | null, areaSqM: number | null) => void
  /** Called when a building/place is picked on the map (auto-fills the address). */
  onAddressResolved?: (label: string, center: { lng: number; lat: number }) => void
  /** Pin saved with the event, restored when an existing event is edited. */
  marker?: { lng: number; lat: number } | null
  /** The pin inside the area, whenever it is dropped or dragged. */
  onMarkerChange?: (marker: { lng: number; lat: number }) => void
}

function formatArea(sqM: number) {
  if (sqM >= 1_000_000) return `${(sqM / 1_000_000).toFixed(2)} sq km`
  if (sqM >= 10_000) return `${(sqM / 10_000).toFixed(2)} hectares`
  return `${sqM.toFixed(0)} sq m`
}

/** One press of the grow/shrink buttons changes the area by this factor. */
const RESIZE_STEP = 1.15

/** How close (in screen pixels) the pointer must be to an edge to grab it. */
const EDGE_HIT_PX = 8
/** Pixels around a vertex/midpoint handle left to Mapbox Draw's own dragging. */
const HANDLE_HIT_PX = 12

/** Smallest radius a drag can draw, so a stray click never wipes the boundary. */
const MIN_DRAW_RADIUS_M = 5

/** The polygon edge the pointer is on, if any. */
interface EdgeHit {
  featureId: string
  ringIndex: number
  vertexIndex: number
}

/** Shortest distance in pixels from `p` to the segment `a`–`b`. */
function distanceToSegment(p: mapboxgl.Point, a: mapboxgl.Point, b: mapboxgl.Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

const DRAW_GREEN = '#22c55e'
const DRAW_GREEN_DARK = '#16a34a'

/**
 * Custom Mapbox Draw theme: polygons (active while drawing and after they auto-close
 * on the start point) are filled green with a darker green outline and vertices.
 */
const DRAW_STYLES: object[] = [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': DRAW_GREEN,
      'fill-outline-color': DRAW_GREEN,
      'fill-opacity': 0.4,
    },
  },
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': DRAW_GREEN_DARK, 'line-width': 2 },
  },
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': DRAW_GREEN_DARK, 'line-width': 2 },
  },
  {
    id: 'gl-draw-polygon-and-line-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 3, 'circle-color': DRAW_GREEN_DARK },
  },
  {
    id: 'gl-draw-vertex-halo',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 6, 'circle-color': '#ffffff' },
  },
  {
    id: 'gl-draw-vertex',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 4, 'circle-color': DRAW_GREEN_DARK },
  },
]

function geoapifyStyle(): mapboxgl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'geoapify-tiles': {
        type: 'raster',
        tiles: [geoapifyRasterTileUrl()],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors © Geoapify',
      },
    },
    layers: [{ id: 'geoapify-tiles', type: 'raster', source: 'geoapify-tiles' }],
  }
}

export function EventMapDraw({
  value,
  focus,
  marker,
  onChange,
  onAddressResolved,
  onMarkerChange,
}: EventMapDrawProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const onAddressResolvedRef = useRef(onAddressResolved)
  const onMarkerChangeRef = useRef(onMarkerChange)
  const detailsAbortRef = useRef<AbortController | null>(null)
  const valueRef = useRef(value)
  const initialMarkerRef = useRef(marker)
  const placeMarkerRef = useRef<((lng: number, lat: number) => void) | null>(null)
  const tracedFocusRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
  /** Building resolved by a double-click, waiting for the operator to confirm it. */
  const [pendingPlace, setPendingPlace] = useState<PlaceDetails | null>(null)
  /** True once the draw tool is armed and the map is waiting for a drag. */
  const [drawArmed, setDrawArmed] = useState(false)
  const drawArmedRef = useRef(false)

  const armDraw = useCallback((armed: boolean) => {
    drawArmedRef.current = armed
    setDrawArmed(armed)
  }, [])
  const [hasArea, setHasArea] = useState(
    !!value && (value.type === 'Polygon' || value.type === 'MultiPolygon'),
  )
  const [areaLabel, setAreaLabel] = useState<string | null>(
    value && (value.type === 'Polygon' || value.type === 'MultiPolygon')
      ? formatArea(area({ type: 'Feature', geometry: value, properties: {} }))
      : null,
  )

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onAddressResolvedRef.current = onAddressResolved
  }, [onAddressResolved])

  useEffect(() => {
    onMarkerChangeRef.current = onMarkerChange
  }, [onMarkerChange])

  /** Replace whatever is drawn with `geometry` and push the change upwards. */
  const applyGeometry = useCallback((draw: MapboxDraw, geometry: Geometry) => {
    draw.deleteAll()
    draw.add({ type: 'Feature', geometry, properties: {} })
    const areaSqM = area({ type: 'Feature', geometry, properties: {} })
    setAreaLabel(formatArea(areaSqM))
    setHasArea(geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')

    // A tightened boundary can leave the pin outside — pull it back in.
    const marker = markerRef.current
    if (marker && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      const { lng, lat } = marker.getLngLat()
      const [nextLng, nextLat] = clampPointToPolygon(geometry as Polygon | MultiPolygon, lng, lat)
      marker.setLngLat([nextLng, nextLat])
      onMarkerChangeRef.current?.({ lng: nextLng, lat: nextLat })
    }

    onChangeRef.current(geometry, areaSqM)
  }, [])

  /** The polygon currently drawn, if any — the bounds the marker is kept inside. */
  const drawnPolygon = useCallback((): Polygon | MultiPolygon | null => {
    const geom = drawRef.current?.getAll().features.at(-1)?.geometry
    if (geom?.type !== 'Polygon' && geom?.type !== 'MultiPolygon') return null
    return geom as Polygon | MultiPolygon
  }, [])

  /**
   * Drop (or move) the pin, keeping it inside the drawn area. The pin is draggable
   * so the director can point at the exact meeting spot, but a drag that leaves the
   * boundary snaps back to the closest point inside it.
   */
  const placeMarker = useCallback(
    (lng: number, lat: number) => {
      const map = mapRef.current
      if (!map) return

      const polygon = drawnPolygon()
      const [x, y] = polygon ? clampPointToPolygon(polygon, lng, lat) : [lng, lat]

      if (markerRef.current) {
        markerRef.current.setLngLat([x, y])
        onMarkerChangeRef.current?.({ lng: x, lat: y })
        return
      }

      const marker = new mapboxgl.Marker({ color: '#1b4332', draggable: true })
        .setLngLat([x, y])
        .addTo(map)
      onMarkerChangeRef.current?.({ lng: x, lat: y })

      const keepInside = () => {
        const bounds = drawnPolygon()
        if (!bounds) return
        const { lng: dragLng, lat: dragLat } = marker.getLngLat()
        const [nextLng, nextLat] = clampPointToPolygon(bounds, dragLng, dragLat)
        if (nextLng !== dragLng || nextLat !== dragLat) marker.setLngLat([nextLng, nextLat])
        onMarkerChangeRef.current?.({ lng: nextLng, lat: nextLat })
      }
      marker.on('drag', keepInside)
      marker.on('dragend', keepInside)

      markerRef.current = marker
    },
    [drawnPolygon],
  )

  useEffect(() => {
    placeMarkerRef.current = placeMarker
  }, [placeMarker])

  /** Grow or shrink the drawn area around its centre by one {@link RESIZE_STEP}. */
  const resizeArea = useCallback(
    (factor: number) => {
      const draw = drawRef.current
      if (!draw) return
      const feature = draw.getAll().features.at(-1)
      const geom = feature?.geometry
      if (geom?.type !== 'Polygon' && geom?.type !== 'MultiPolygon') return
      applyGeometry(draw, scalePolygon(geom as Polygon | MultiPolygon, factor))
    },
    [applyGeometry],
  )

  useEffect(() => {
    if (!containerRef.current || !GEOAPIFY_API_KEY) return

    let cancelled = false
    mapboxgl.accessToken = GEOAPIFY_API_KEY

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: geoapifyStyle(),
      center: DEFAULT_MAP_CENTER,
      zoom: 12,
    })

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: DRAW_STYLES,
    })

    map.addControl(draw, 'top-left')
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    /** True unless the operator is mid-way through drawing an area by hand. */
    const isEditing = () => draw.getMode() === 'simple_select' || draw.getMode() === 'direct_select'

    const syncGeometry = () => {
      const collection = draw.getAll()
      if (collection.features.length === 0) {
        setAreaLabel(null)
        setHasArea(false)
        onChangeRef.current(null, null)
        return
      }
      const feature = collection.features[collection.features.length - 1]
      const geom = feature.geometry
      let areaSqM: number | null = null
      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        areaSqM = area(feature)
        setAreaLabel(formatArea(areaSqM))
        setHasArea(true)
      } else {
        setAreaLabel(null)
        setHasArea(false)
      }
      onChangeRef.current(geom, areaSqM)
    }

    map.on('load', () => {
      if (cancelled) return
      setReady(true)
      const initial = valueRef.current
      if (initial) {
        draw.add({
          type: 'Feature',
          geometry: initial,
          properties: {},
        })
      }
      const savedMarker = initialMarkerRef.current
      if (savedMarker) {
        placeMarkerRef.current?.(savedMarker.lng, savedMarker.lat)
        map.flyTo({ center: [savedMarker.lng, savedMarker.lat], zoom: 18, essential: true })
      }
    })

    // The polygon button arms our drag-to-size gesture rather than Draw's
    // click-a-corner-at-a-time tool, so an area is drawn in one drag.
    map.on('draw.modechange', (e: { mode: string }) => {
      if (e.mode !== 'draw_polygon') return
      draw.changeMode('simple_select')
      armDraw(true)
      map.getCanvas().style.cursor = 'crosshair'
    })

    map.on('draw.create', syncGeometry)
    map.on('draw.update', syncGeometry)
    map.on('draw.delete', syncGeometry)

    /**
     * Resolve the building under the pointer and hand it to the confirmation
     * modal — nothing on the map changes until the operator says yes.
     */
    const handleBuildingSelect = async (lngLat: mapboxgl.LngLat) => {
      detailsAbortRef.current?.abort()
      const controller = new AbortController()
      detailsAbortRef.current = controller

      setDetecting(true)
      const details = await getPlaceDetails(lngLat.lat, lngLat.lng, controller.signal)
      if (controller.signal.aborted) return
      setDetecting(false)
      if (!details) return

      setPendingPlace(details)
    }

    map.on('click', (e) => {
      // Clicking the drawn area opens its vertices for dragging, so the operator
      // can widen or reshape the pre-traced boundary instead of losing it.
      if (!isEditing() || drawArmedRef.current) return
      const [featureId] = draw.getFeatureIdsAt(e.point)
      if (featureId) draw.changeMode('direct_select', { featureId: String(featureId) })
    })

    map.on('dblclick', (e) => {
      // Ignored while an area is being drawn by hand.
      if (!isEditing() || drawArmedRef.current) return
      // Cancels the map's own zoom-on-dblclick either way.
      e.preventDefault()
      const [featureId] = draw.getFeatureIdsAt(e.point)
      if (featureId) {
        // Inside the drawn area: pick up the whole boundary so it can be dragged
        // to a new spot without reshaping it.
        draw.changeMode('simple_select', { featureIds: [String(featureId)] })
        return
      }
      // Anywhere else: offer to trace the building that was double-clicked.
      void handleBuildingSelect(e.lngLat)
    })

    /**
     * Which drawn edge sits under a screen point. Vertex and midpoint handles win
     * over the edge, so Mapbox Draw keeps its corner-dragging and add-a-corner
     * behaviour untouched.
     */
    const edgeAt = (point: mapboxgl.Point): EdgeHit | null => {
      // While an area is being drawn by hand, every click belongs to that gesture.
      if (!isEditing() || drawArmedRef.current) return null
      for (const feature of draw.getAll().features) {
        const geom = feature.geometry
        if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue

        const rings = polygonRings(geom)
        for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
          const ring = rings[ringIndex]
          const last = ring[ring.length - 1]
          const closed = ring.length > 1 && ring[0][0] === last[0] && ring[0][1] === last[1]
          const corners = (closed ? ring.slice(0, -1) : ring).map(([lng, lat]) =>
            map.project([lng, lat]),
          )
          if (corners.length < 2) continue

          for (let i = 0; i < corners.length; i += 1) {
            const a = corners[i]
            const b = corners[(i + 1) % corners.length]
            const mid = new mapboxgl.Point((a.x + b.x) / 2, (a.y + b.y) / 2)
            if (point.dist(a) < HANDLE_HIT_PX || point.dist(b) < HANDLE_HIT_PX) continue
            if (point.dist(mid) < HANDLE_HIT_PX) continue
            if (distanceToSegment(point, a, b) <= EDGE_HIT_PX) {
              return { featureId: String(feature.id), ringIndex, vertexIndex: i }
            }
          }
        }
      }
      return null
    }

    const canvasContainer = map.getCanvasContainer()
    const pointOf = (ev: MouseEvent) => {
      const rect = canvasContainer.getBoundingClientRect()
      return new mapboxgl.Point(ev.clientX - rect.left, ev.clientY - rect.top)
    }

    let edgeDrag: (EdgeHit & { last: mapboxgl.LngLat }) | null = null

    const onEdgeMove = (ev: MouseEvent) => {
      if (!edgeDrag) return
      const next = map.unproject(pointOf(ev))
      const feature = draw.get(edgeDrag.featureId)
      const geom = feature?.geometry
      if (geom?.type !== 'Polygon' && geom?.type !== 'MultiPolygon') return

      const moved = translatePolygonEdge(
        geom as Polygon | MultiPolygon,
        edgeDrag.ringIndex,
        edgeDrag.vertexIndex,
        next.lng - edgeDrag.last.lng,
        next.lat - edgeDrag.last.lat,
      )
      edgeDrag.last = next
      draw.add({ ...feature!, geometry: moved })
    }

    const onEdgeUp = () => {
      if (!edgeDrag) return
      edgeDrag = null
      window.removeEventListener('mousemove', onEdgeMove)
      window.removeEventListener('mouseup', onEdgeUp)
      syncGeometry()
    }

    /**
     * Capture-phase so a grabbed edge never reaches Mapbox's pan handler or Draw's
     * move-the-whole-feature handler — dragging a side pushes just that side in or out.
     */
    const onEdgeDown = (ev: MouseEvent) => {
      if (ev.button !== 0) return
      const point = pointOf(ev)
      const hit = edgeAt(point)
      if (!hit) return
      ev.preventDefault()
      ev.stopPropagation()
      edgeDrag = { ...hit, last: map.unproject(point) }
      window.addEventListener('mousemove', onEdgeMove)
      window.addEventListener('mouseup', onEdgeUp)
    }

    /** Centre of the area being dragged out, plus the boundary it would replace. */
    let drawDrag: { centre: mapboxgl.LngLat; previous: Geometry | null } | null = null

    const onDrawMove = (ev: MouseEvent) => {
      if (!drawDrag) return
      const edge = map.unproject(pointOf(ev))
      const radiusM = metersBetween(drawDrag.centre.lng, drawDrag.centre.lat, edge.lng, edge.lat)
      if (radiusM < MIN_DRAW_RADIUS_M) return

      // The previous area only clears once the new one is actually being sized.
      draw.deleteAll()
      draw.add({
        type: 'Feature',
        geometry: circlePolygon(drawDrag.centre.lng, drawDrag.centre.lat, radiusM),
        properties: {},
      })
    }

    const onDrawUp = (ev: MouseEvent) => {
      if (!drawDrag) return
      const { centre, previous } = drawDrag
      drawDrag = null
      window.removeEventListener('mousemove', onDrawMove)
      window.removeEventListener('mouseup', onDrawUp)
      armDraw(false)
      map.getCanvas().style.cursor = ''

      const edge = map.unproject(pointOf(ev))
      const radiusM = metersBetween(centre.lng, centre.lat, edge.lng, edge.lat)
      if (radiusM < MIN_DRAW_RADIUS_M) {
        // Too small to be a real drag — put back whatever was there.
        draw.deleteAll()
        if (previous) draw.add({ type: 'Feature', geometry: previous, properties: {} })
        return
      }
      applyGeometry(draw, circlePolygon(centre.lng, centre.lat, radiusM))
    }

    /**
     * With the draw tool armed, pressing on the map anchors the centre of the new
     * area and the drag sizes it; releasing replaces the old boundary with it.
     */
    const onDrawDown = (ev: MouseEvent) => {
      if (ev.button !== 0 || !drawArmedRef.current) return
      ev.preventDefault()
      ev.stopPropagation()
      drawDrag = {
        centre: map.unproject(pointOf(ev)),
        previous: draw.getAll().features.at(-1)?.geometry ?? null,
      }
      window.addEventListener('mousemove', onDrawMove)
      window.addEventListener('mouseup', onDrawUp)
    }

    canvasContainer.addEventListener('mousedown', onDrawDown, true)
    canvasContainer.addEventListener('mousedown', onEdgeDown, true)

    map.on('mousemove', (e) => {
      if (edgeDrag) return
      map.getCanvas().style.cursor = edgeAt(e.point) ? 'move' : ''
    })

    mapRef.current = map
    drawRef.current = draw

    return () => {
      cancelled = true
      detailsAbortRef.current?.abort()
      canvasContainer.removeEventListener('mousedown', onDrawDown, true)
      canvasContainer.removeEventListener('mousedown', onEdgeDown, true)
      window.removeEventListener('mousemove', onDrawMove)
      window.removeEventListener('mouseup', onDrawUp)
      window.removeEventListener('mousemove', onEdgeMove)
      window.removeEventListener('mouseup', onEdgeUp)
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
      drawRef.current = null
      setReady(false)
    }
  }, [applyGeometry, armDraw])

  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw || !ready || !focus) return

    map.flyTo({ center: [focus.lng, focus.lat], zoom: 18, essential: true })

    placeMarker(focus.lng, focus.lat)

    // Pre-trace the building under the picked suggestion so the area starts filled
    // in. Never clobber an area that is already drawn — the operator owns that one.
    const focusKey = `${focus.lng},${focus.lat}`
    if (tracedFocusRef.current === focusKey) return
    tracedFocusRef.current = focusKey
    if (draw.getAll().features.length > 0) return

    detailsAbortRef.current?.abort()
    const controller = new AbortController()
    detailsAbortRef.current = controller

    setDetecting(true)
    void getPlaceDetails(focus.lat, focus.lng, controller.signal).then((details) => {
      if (controller.signal.aborted) return
      setDetecting(false)
      if (draw.getAll().features.length > 0) return
      applyGeometry(
        draw,
        details?.geometry ?? circlePolygon(focus.lng, focus.lat, FALLBACK_GEOFENCE_RADIUS_M),
      )
      placeMarker(focus.lng, focus.lat)
    })
  }, [applyGeometry, focus, placeMarker, ready])

  /** Replace the drawn area with the confirmed building's footprint. */
  const confirmPendingPlace = useCallback(() => {
    const draw = drawRef.current
    const details = pendingPlace
    setPendingPlace(null)
    if (!draw || !details) return

    // Keep the pre-trace effect from re-tracing over the operator's choice.
    tracedFocusRef.current = `${details.lng},${details.lat}`
    applyGeometry(
      draw,
      details.geometry ?? circlePolygon(details.lng, details.lat, FALLBACK_GEOFENCE_RADIUS_M),
    )
    // Mark the chosen building straight away, inside its freshly traced area.
    placeMarker(details.lng, details.lat)
    onAddressResolvedRef.current?.(details.label, { lng: details.lng, lat: details.lat })
  }, [applyGeometry, pendingPlace, placeMarker])

  const pendingGeometry = pendingPlace
    ? (pendingPlace.geometry ??
      circlePolygon(pendingPlace.lng, pendingPlace.lat, FALLBACK_GEOFENCE_RADIUS_M))
    : null

  if (!GEOAPIFY_API_KEY) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Geoapify key missing. Add <code className="font-mono">VITE_GEOAPIFY_API_KEY</code> to your{' '}
        <code className="font-mono">.env</code> file.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">Event area</label>
        <div className="flex items-center gap-2">
          {hasArea && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => resizeArea(1 / RESIZE_STEP)}
                title="Shrink the area"
                aria-label="Shrink the area"
                className="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={() => resizeArea(RESIZE_STEP)}
                title="Expand the area"
                aria-label="Expand the area"
                className="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
          {detecting ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Detecting building…
            </span>
          ) : (
            areaLabel && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                Area: {areaLabel}
              </span>
            )
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        This boundary is what counts a volunteer as present. Drag its corners or sides to reshape
        it, drag the pin to the meeting spot, or use + / − to resize. Double-click another building
        to trace it instead, or use the draw tool to size an area by dragging.
      </p>
      {drawArmed && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
          Press on the middle of the spot and drag outwards to size the new area — letting go
          replaces the area currently drawn.
        </p>
      )}
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-gray-300"
      />
      <ConfirmBuildingModal
        isOpen={!!pendingPlace}
        buildingName={pendingPlace?.label ?? ''}
        areaLabel={
          pendingGeometry
            ? formatArea(area({ type: 'Feature', geometry: pendingGeometry, properties: {} }))
            : null
        }
        approximate={!!pendingPlace && !pendingPlace.geometry}
        onCancel={() => setPendingPlace(null)}
        onConfirm={confirmPendingPlace}
      />
    </div>
  )
}
