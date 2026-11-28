import type { CertificateDesign, CertificateImage } from '../../types/certificate-template'
import { apiClient } from '../api-client'

/** Artwork routes are private S3 and need a bearer, so swap them for object URLs and back. */

const objectUrls = new Map<string, string>()
const routes = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

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

/** Object URLs live for the tab to avoid re-downloading on every mount. */
async function resolveOne(url: string): Promise<string> {
  if (isInlineAsset(url)) return url

  try {
    return await loadAsset(url)
  } catch {
    // Keep the route so a save doesn't delete artwork that merely failed to load.
    return url
  }
}

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

/** Object URLs go back as routes; fresh data URLs go up as-is. */
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
