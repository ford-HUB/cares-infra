import { PDF_LOGO_RASTER_PX, PDF_LOGO_SRC } from '../../constants/pdf-export'

/** Pre-rasterised small (source is ~1 MB); loads on import, and the band prints without it if not ready. */
let logoDataUrl: string | null = null

if (typeof Image !== 'undefined') {
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = PDF_LOGO_RASTER_PX
    canvas.height = PDF_LOGO_RASTER_PX
    const context = canvas.getContext('2d')
    if (!context) return
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, PDF_LOGO_RASTER_PX, PDF_LOGO_RASTER_PX)
    logoDataUrl = canvas.toDataURL('image/png')
  }
  image.src = PDF_LOGO_SRC
}

/** `null` while loading or after failure. */
export function getPdfLogo() {
  return logoDataUrl
}
