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

  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 ${className ?? ''}`}
        aria-label={`Loading ${alt}`}
      />
    )
  }

  if (!objectUrl) {
    return null
  }

  return <img src={objectUrl} alt={alt} className={className} />
}
