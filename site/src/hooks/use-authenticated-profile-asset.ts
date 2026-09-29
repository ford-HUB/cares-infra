import { useEffect, useState } from 'react'
import { apiClient } from '../services/api-client'

export type ProfileAssetKind = 'avatar' | 'signature'

export function useAuthenticatedProfileAsset(
  asset: ProfileAssetKind | null,
  enabled = true,
) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!enabled || !asset) {
      setObjectUrl(null)
      setLoading(false)
      setFailed(false)
      return
    }

    let cancelled = false
    let blobUrl: string | null = null

    setLoading(true)
    setFailed(false)

    void apiClient
      .get(`/api/v1/profile/me/${asset}`, { responseType: 'blob' })
      .then((response: { data: Blob }) => {
        if (cancelled) return
        blobUrl = URL.createObjectURL(response.data)
        setObjectUrl(blobUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setObjectUrl(null)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [asset, enabled])

  return { objectUrl, loading, failed }
}
