import { ExternalLink, MapPin } from 'lucide-react'
import {
  assistanceMapsLink,
  assistanceStaticMapUrl,
  formatCoordinates,
} from '../../../constants/assistance-requests'
import type { AssistanceRequestLocation } from '../../../types/assistance-request'

/**
 * Where the beneficiary pinned the need. A static map when a Mapbox token is set,
 * always a link out for directions — the field officer plans the visit from it.
 */
export function AssistanceLocationCard({ location }: { location: AssistanceRequestLocation }) {
  const { latitude, longitude, details } = location
  const mapUrl = assistanceStaticMapUrl(latitude, longitude)
  const link = assistanceMapsLink(latitude, longitude)

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
      {mapUrl && (
        <a href={link} target="_blank" rel="noreferrer" aria-label="Open the pinned location">
          <img
            src={mapUrl}
            alt={`Map pin at ${formatCoordinates(latitude, longitude)}`}
            className="h-36 w-full bg-gray-100 object-cover"
            loading="lazy"
          />
        </a>
      )}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1 text-xs">
          {details && <p className="truncate font-medium text-gray-800">{details}</p>}
          <p className="text-gray-500">{formatCoordinates(latitude, longitude)}</p>
        </div>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--cares-primary)] hover:underline"
        >
          Open map
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
