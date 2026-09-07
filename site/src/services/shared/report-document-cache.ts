import { apiClient } from '../api-client'

/**
 * Report attachments live in a private S3 bucket, so the route the server hands back
 * cannot go straight into an `<iframe src>` or a download link — the request would
 * carry no bearer token and the browser would show a 401 instead of the file. This
 * module is the one place that translates a route into something the browser can open.
 *
 * Object URLs are kept for the life of the tab: a director reopens the same report
 * repeatedly while working through a period, and the alternative is re-downloading it
 * on every open.
 */
const objectUrls = new Map<string, string>()
/** In-flight fetches, so opening a file twice does not request it twice. */
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
