import type { ReactNode } from 'react'
import { useAuthenticatedImage } from '../../../hooks/use-authenticated-image'
import { Skeleton } from '@/components/ui/skeleton'

interface EventImageProps {
  eventId: number
  /** Position in the event's stored image list. */
  index: number
  alt: string
  className?: string
  /** Shown when the photo is missing or the fetch fails. */
  fallback?: ReactNode
}

/** Photos are in private S3, so bytes load via the authenticated proxy; skeleton/fallback reuse `className`. */
export function EventImage({
  eventId,
  index,
  alt,
  className,
  fallback = null,
}: EventImageProps) {
  const { objectUrl, loading } = useAuthenticatedImage(
    `/api/v1/events/${eventId}/images/${index}`,
  )

  if (loading) {
    return <Skeleton className={className} aria-hidden />
  }

  if (!objectUrl) {
    return <>{fallback}</>
  }

  return <img src={objectUrl} alt={alt} className={className} />
}
