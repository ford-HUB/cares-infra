import type { ReactNode } from 'react'
import { useAuthenticatedImage } from '../../../hooks/use-authenticated-image'
import { Skeleton } from '@/components/ui/skeleton'

interface EventImageProps {
  eventId: number
  /** Position of the photo in the event's stored image list. */
  index: number
  alt: string
  className?: string
  /** Rendered when the photo is missing or the fetch fails. */
  fallback?: ReactNode
}

/**
 * Event photos live in a private S3 bucket, so a plain `<img src={s3Url}>` renders
 * broken. This pulls the bytes through the authenticated proxy route instead and
 * paints the object URL. The skeleton and fallback take the caller's className so
 * they keep the image's exact box.
 */
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
