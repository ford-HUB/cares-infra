import { useEffect, useState } from 'react'
import { apiClient } from '../services/api-client'
import { chatAttachmentPath } from '../services/chat-service'

/**
 * Attachments live in a private bucket and are streamed through the API, so an
 * image needs an authenticated fetch before it can be used as an `<img src>`.
 */
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
