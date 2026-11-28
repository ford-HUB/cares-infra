import { Skeleton } from '@/components/ui/skeleton'
import type { ProfileAssetKind } from '../../../hooks/use-authenticated-profile-asset'
import { useAuthenticatedProfileAsset } from '../../../hooks/use-authenticated-profile-asset'

interface AuthenticatedProfileImageProps {
  asset: ProfileAssetKind
  alt: string
  className?: string
  enabled?: boolean
}

export function AuthenticatedProfileImage({
  asset,
  alt,
  className,
  enabled = true,
}: AuthenticatedProfileImageProps) {
  const { objectUrl, loading } = useAuthenticatedProfileAsset(asset, enabled)

  // The placeholder takes the caller's className, which carries the avatar's box.
  if (loading) {
    return (
      <Skeleton className={className} aria-hidden />
    )
  }

  if (!objectUrl) {
    return null
  }

  return <img src={objectUrl} alt={alt} className={className} />
}
