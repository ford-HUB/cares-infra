import { apiClient } from '../api-client'

/** Private S3 routes need a bearer, so open them as object URLs, kept for the tab's life. */
const objectUrls = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

export async function loadReportDocument(route: string): Promise<string> {
  const cached = objectUrls.get(route)
  if (cached) return cached

  const inFlight = pending.get(route)
  if (inFlight) return inFlight

  const request = apiClient
    .get(route, { responseType: 'blob' })
    .then((response: { data: Blob }) => {
      const objectUrl = URL.createObjectURL(response.data)
      objectUrls.set(route, objectUrl)
      return objectUrl
    })
    .finally(() => pending.delete(route))

  pending.set(route, request)
  return request
}
