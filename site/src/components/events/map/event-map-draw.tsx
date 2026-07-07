import area from '@turf/area'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { Geometry } from 'geojson'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MAP_CENTER } from '../../../constants/event'
import { GEOAPIFY_API_KEY, geoapifyRasterTileUrl } from '../../../constants/geoapify'
import { getPlaceDetails } from '../../../services/geocoding-service'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface EventMapDrawProps {
  value?: Geometry | null
  /** When set, the map flies to this location and drops a marker. */
  focus?: { lng: number; lat: number } | null
  onChange: (geojson: Geometry | null, areaSqM: number | null) => void
  /** Called when a building/place is picked on the map (auto-fills the address). */
  onAddressResolved?: (label: string, center: { lng: number; lat: number }) => void
}

function formatArea(sqM: number) {
  if (sqM >= 1_000_000) return `${(sqM / 1_000_000).toFixed(2)} sq km`
  if (sqM >= 10_000) return `${(sqM / 10_000).toFixed(2)} hectares`
  return `${sqM.toFixed(0)} sq m`
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

export function EventMapDraw({ value, focus, onChange, onAddressResolved }: EventMapDrawProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const onAddressResolvedRef = useRef(onAddressResolved)
  const detailsAbortRef = useRef<AbortController | null>(null)
  const valueRef = useRef(value)
  const [ready, setReady] = useState(false)
  const [detecting, setDetecting] = useState(false)
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

    const syncGeometry = () => {
      const collection = draw.getAll()
      if (collection.features.length === 0) {
        setAreaLabel(null)
        onChangeRef.current(null, null)
        return
      }
      const feature = collection.features[collection.features.length - 1]
      const geom = feature.geometry
      let areaSqM: number | null = null
      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        areaSqM = area(feature)
        setAreaLabel(formatArea(areaSqM))
      } else {
        setAreaLabel(null)
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
    })

    map.on('draw.create', syncGeometry)
    map.on('draw.update', syncGeometry)
    map.on('draw.delete', syncGeometry)

    const handleBuildingSelect = async (lngLat: mapboxgl.LngLat) => {
      // Only when not actively drawing/editing, so vertex clicks aren't hijacked.
      if (draw.getMode() !== 'simple_select') return

      detailsAbortRef.current?.abort()
      const controller = new AbortController()
      detailsAbortRef.current = controller

      setDetecting(true)
      const details = await getPlaceDetails(lngLat.lat, lngLat.lng, controller.signal)
      if (controller.signal.aborted) return
      setDetecting(false)
      if (!details) return

      if (details.geometry) {
        draw.deleteAll()
        draw.add({ type: 'Feature', geometry: details.geometry, properties: {} })
        const areaSqM = area({ type: 'Feature', geometry: details.geometry, properties: {} })
        setAreaLabel(formatArea(areaSqM))
        onChangeRef.current(details.geometry, areaSqM)
      }

      onAddressResolvedRef.current?.(details.label, { lng: details.lng, lat: details.lat })
    }

    map.on('click', (e) => {
      void handleBuildingSelect(e.lngLat)
    })

    mapRef.current = map
    drawRef.current = draw

    return () => {
      cancelled = true
      detailsAbortRef.current?.abort()
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
      drawRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !focus) return

    map.flyTo({ center: [focus.lng, focus.lat], zoom: 15, essential: true })

    if (markerRef.current) {
      markerRef.current.setLngLat([focus.lng, focus.lat])
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#1b4332' })
        .setLngLat([focus.lng, focus.lat])
        .addTo(map)
    }
  }, [focus, ready])

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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Event area (draw on map)</label>
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
      <p className="text-xs text-gray-500">
        Click directly on a building to auto-trace its shape and fill in its address. Or use the
        polygon tool to outline the area manually — click each corner and finish on the first point
        (or double-click) to close it. Completed areas fill green automatically.
      </p>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-gray-300"
      />
    </div>
  )
}
