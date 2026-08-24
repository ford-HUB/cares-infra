import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import {
  CEBU_BOUNDS_PADDING,
  CEBU_PROVINCE_BOUNDS,
  EVENT_PIN_FOCUS_ZOOM,
} from '../../../constants/event'
import { EVENT_PIN_ACCENTS } from '../../../constants/event-map'
import { GEOAPIFY_API_KEY, geoapifyRasterTileUrl } from '../../../constants/geoapify'
import type { EventMapPin } from '../../../types/event'
import 'mapbox-gl/dist/mapbox-gl.css'

interface EventLocationsMapProps {
  pins: EventMapPin[]
  /** Event id of the pin currently opened in the info card, if any. */
  selectedEventId: number | null
  /** Bumped by the parent to snap the view back to the whole-of-Cebu framing. */
  resetToken: number
  onSelect: (eventId: number) => void
}

/** Inline photo icon shown when an event has no uploaded image. */
const FALLBACK_PIN_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>`

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

/**
 * Build the marker DOM for one event: a round thumbnail of the event image
 * (or a photo icon when there is none) on a status-coloured teardrop.
 */
function createPinElement(pin: EventMapPin): HTMLButtonElement {
  const accent = EVENT_PIN_ACCENTS[pin.status] ?? EVENT_PIN_ACCENTS.Completed

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'cares-event-pin'
  button.style.setProperty('--pin-accent', accent)
  button.title = pin.title
  button.setAttribute('aria-label', `${pin.title} — ${pin.participants} participants`)

  const bubble = document.createElement('span')
  bubble.className = 'cares-event-pin__bubble'

  if (pin.imageUrl) {
    const image = document.createElement('img')
    image.src = pin.imageUrl
    image.alt = ''
    image.className = 'cares-event-pin__image'
    // A broken/expired image URL falls back to the icon rather than a torn pin.
    image.onerror = () => {
      image.remove()
      bubble.innerHTML = FALLBACK_PIN_ICON
    }
    bubble.appendChild(image)
  } else {
    bubble.innerHTML = FALLBACK_PIN_ICON
  }

  const count = document.createElement('span')
  count.className = 'cares-event-pin__count'
  count.textContent = String(pin.participants)

  button.append(bubble, count)
  return button
}

export function EventLocationsMap({
  pins,
  selectedEventId,
  resetToken,
  onSelect,
}: EventLocationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map())
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || !GEOAPIFY_API_KEY) return

    mapboxgl.accessToken = GEOAPIFY_API_KEY

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: geoapifyStyle(),
      bounds: CEBU_PROVINCE_BOUNDS,
      fitBoundsOptions: { padding: CEBU_BOUNDS_PADDING },
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    mapRef.current = map

    const markers = markersRef.current
    return () => {
      markers.forEach((marker) => marker.remove())
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-sync markers whenever the pin set changes: add the new ones, drop the
  // ones whose event is gone, and leave the rest (and the map view) untouched.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markers = markersRef.current
    const nextIds = new Set(pins.map((pin) => pin.eventId))

    markers.forEach((marker, eventId) => {
      if (nextIds.has(eventId)) return
      marker.remove()
      markers.delete(eventId)
    })

    pins.forEach((pin) => {
      const existing = markers.get(pin.eventId)
      if (existing) {
        existing.setLngLat(pin.center)
        return
      }
      const element = createPinElement(pin)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectRef.current(pin.eventId)
      })
      markers.set(
        pin.eventId,
        new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat(pin.center).addTo(map),
      )
    })
  }, [pins])

  // Flying is a view change, not a marker change, so it stays in its own effect.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker, eventId) => {
      marker.getElement().classList.toggle('is-selected', eventId === selectedEventId)
    })

    if (selectedEventId === null) return
    const selected = pins.find((pin) => pin.eventId === selectedEventId)
    if (selected) map.flyTo({ center: selected.center, zoom: EVENT_PIN_FOCUS_ZOOM, essential: true })
  }, [pins, selectedEventId])

  // Skipped on mount: the map already opens on these bounds.
  const firstResetRef = useRef(true)
  useEffect(() => {
    if (firstResetRef.current) {
      firstResetRef.current = false
      return
    }
    mapRef.current?.fitBounds(CEBU_PROVINCE_BOUNDS, { padding: CEBU_BOUNDS_PADDING })
  }, [resetToken])

  if (!GEOAPIFY_API_KEY) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Geoapify key missing. Add <code className="font-mono">VITE_GEOAPIFY_API_KEY</code> to your{' '}
        <code className="font-mono">.env</code> file to load the event map.
      </div>
    )
  }

  return <div ref={containerRef} className="h-full w-full" />
}
