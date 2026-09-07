import type { CertificateDesign, CertificateImage } from '../../types/certificate-template'
import { apiClient } from '../api-client'

/**
 * Imported certificate artwork lives in a private S3 bucket, so the route the server
 * hands back cannot go straight into an `<img src>` — the request would carry no bearer
 * token and paint broken. This module is the one place that translates: designs coming
 * off the API get object URLs the browser can draw, and designs going back to it get
 * their routes again.
 *
 * Doing it here rather than in the components means the canvas, the layout editor, the
 * frame picker and the image manifest all keep taking a plain `CertificateDesign`.
 */

/** Object URL per asset route, so the same logo on three sheets is fetched once. */
const objectUrls = new Map<string, string>()
/** The reverse, so a design edited in the form can be turned back into routes. */
const routes = new Map<string, string>()
/** In-flight fetches, so a gallery of templates does not request one asset twice. */
const pending = new Map<string, Promise<string>>()

/** A file the director imported in this session — already drawable, nothing to fetch. */
function isInlineAsset(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('blob:')
}

async function loadAsset(route: string): Promise<string> {
  const cached = objectUrls.get(route)
  if (cached) return cached

  const inFlight = pending.get(route)
  if (inFlight) return inFlight

  const request = apiClient
    .get(route, { responseType: 'blob' })
    .then((response: { data: Blob }) => {
      const objectUrl = URL.createObjectURL(response.data)
      objectUrls.set(route, objectUrl)
      routes.set(objectUrl, route)
      return objectUrl
    })
    .finally(() => pending.delete(route))

  pending.set(route, request)
  return request
}

/**
 * Object URLs are kept for the life of the tab rather than revoked per render: a
 * template's artwork is looked at repeatedly — gallery, detail panel, customizer — and
 * the alternative is re-downloading it on every mount.
 */
async function resolveOne(url: string): Promise<string> {
  if (isInlineAsset(url)) return url

  try {
    return await loadAsset(url)
  } catch {
    // The route is handed back untouched rather than dropped: that piece of artwork
    // renders broken, but a save from this session still round-trips it instead of
    // deleting a file the fetch merely failed to reach.
    return url
  }
}

/** Swaps every stored asset route in a design for a URL the browser can paint. */
export async function resolveDesignAssets(
  design: CertificateDesign,
): Promise<CertificateDesign> {
  const [frameSvgUrl, sealSvgUrl, images] = await Promise.all([
    design.frameSvgUrl ? resolveOne(design.frameSvgUrl) : undefined,
    design.sealSvgUrl ? resolveOne(design.sealSvgUrl) : undefined,
    Promise.all(
      design.images.map(
        async (image): Promise<CertificateImage> => ({
          ...image,
          url: await resolveOne(image.url),
        }),
      ),
    ),
  ])

  return {
    ...design,
    frameSvgUrl: frameSvgUrl || undefined,
    sealSvgUrl: sealSvgUrl || undefined,
    images,
  }
}

/**
 * The inverse, applied on save: an object URL goes back as the route it came from, and
 * a freshly imported data URL goes up as-is for the server to store.
 */
export function toStoredAssetUrl(url: string): string {
  return routes.get(url) ?? url
}

export function toStoredDesignAssets(design: CertificateDesign): CertificateDesign {
  return {
    ...design,
    frameSvgUrl: design.frameSvgUrl
      ? toStoredAssetUrl(design.frameSvgUrl)
      : undefined,
    sealSvgUrl: design.sealSvgUrl ? toStoredAssetUrl(design.sealSvgUrl) : undefined,
    images: design.images.map((image) => ({
      ...image,
      url: toStoredAssetUrl(image.url),
    })),
  }
}
