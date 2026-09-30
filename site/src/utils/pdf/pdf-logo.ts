import { PDF_LOGO_RASTER_PX, PDF_LOGO_SRC } from '../../constants/pdf-export'

/**
 * The CARES seal, pre-rasterised for the PDF title band. The source PNG is ~1 MB at
 * 1000px; drawing it once onto a small canvas keeps every export light. Loading
 * starts when this module is imported, so it is ready long before anyone clicks
 * export — if it isn't (offline, slow first load), the band simply prints without it.
 */
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

/** The seal as a PNG data URL, or `null` while it is still loading or failed to. */
export function getPdfLogo() {
  return logoDataUrl
}
