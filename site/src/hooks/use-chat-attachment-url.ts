import { useEffect, useState } from 'react'
import { apiClient } from '../services/api-client'
import { chatAttachmentPath } from '../services/chat-service'

/** Private bucket streamed through the API, so `<img src>` needs an authenticated fetch. */
export function useChatAttachmentUrl(attachmentId: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!attachmentId) return

    let cancelled = false
    let blobUrl: string | null = null

    void apiClient
      .get(chatAttachmentPath(attachmentId), { responseType: 'blob' })
      .then((response: { data: Blob }) => {
        if (cancelled) return
        blobUrl = URL.createObjectURL(response.data)
        setObjectUrl(blobUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [attachmentId])

  return { objectUrl, failed }
}
