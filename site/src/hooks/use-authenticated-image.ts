import { useEffect, useState } from 'react'
import { apiClient } from '../services/api-client'

interface LoadedImage {
  path: string
  url: string | null
  failed: boolean
}

/**
 * Fetches an image behind the bearer token and hands back an object URL.
 * Pass `null` to skip the request; the URL is revoked on unmount or path change.
 * State is keyed by path so a stale result never paints under a new one.
 */
export function useAuthenticatedImage(path: string | null) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null)

  useEffect(() => {
    if (!path) return

    let cancelled = false
    let blobUrl: string | null = null

    void apiClient
      .get(path, { responseType: 'blob' })
      .then((response: { data: Blob }) => {
        if (cancelled) return
        blobUrl = URL.createObjectURL(response.data)
        setLoaded({ path, url: blobUrl, failed: false })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ path, url: null, failed: true })
      })

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [path])

  const current = loaded?.path === path ? loaded : null

  return {
    objectUrl: current?.url ?? null,
    loading: Boolean(path) && !current,
    failed: current?.failed ?? false,
  }
}
