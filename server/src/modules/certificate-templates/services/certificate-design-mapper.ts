import type {
  CertificateDesignDto,
  StoredCertificateDesign,
} from '../dto/certificate-templates-site-dto';

/**
 * Where the portal reads one imported file back from. The bucket is private, so the
 * stored design holds asset ids and this is the only shape a browser can fetch — a
 * deployment's frozen design points at the template's assets too, which is why the
 * route is built from a template id rather than owned by either feature.
 */
export function certificateAssetRoute(
  templateId: string,
  assetId: string,
): string {
  return `/api/v1/certificate-templates/${templateId}/assets/${assetId}`;
}

/** Stored design (asset ids) → the design the portal draws (asset routes). */
export function toDesignDto(
  design: StoredCertificateDesign,
  templateId: string,
): CertificateDesignDto {
  const route = (assetId: string) => certificateAssetRoute(templateId, assetId);

  return {
    accent: design.accent,
    frame: design.frame,
    ...(design.frame_asset_id
      ? {
          frame_svg_url: route(design.frame_asset_id),
          frame_svg_name: design.frame_svg_name,
        }
      : {}),
    layout: design.layout,
    font: design.font,
    element_fonts: design.element_fonts ?? {},
    element_sizes: design.element_sizes ?? {},
    element_widths: design.element_widths ?? {},
    element_heights: design.element_heights ?? {},
    element_aligns: design.element_aligns ?? {},
    headline: design.headline,
    body: design.body,
    show_seal: design.show_seal,
    seal_label: design.seal_label,
    seal_style: design.seal_style,
    seal_accent: design.seal_accent,
    ...(design.seal_asset_id
      ? {
          seal_svg_url: route(design.seal_asset_id),
          seal_svg_name: design.seal_svg_name,
        }
      : {}),
    images: (design.images ?? []).map((image) => ({
      id: image.id,
      url: route(image.asset_id),
      name: image.name,
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      shape: image.shape,
      z: image.z,
    })),
  };
}

/** Every asset a stored design still points at. */
export function designAssetIds(design: StoredCertificateDesign): string[] {
  return [
    ...(design.images ?? []).map((image) => image.asset_id),
    design.frame_asset_id,
    design.seal_asset_id,
  ].filter((assetId): assetId is string => Boolean(assetId));
}
