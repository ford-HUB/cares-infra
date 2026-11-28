import type {
  CertificateDesignDto,
  StoredCertificateDesign,
} from '../dto/certificate-templates-site-dto';

/** Private bucket: designs hold asset ids and browsers fetch this route. Keyed by template since deployments share its assets. */
export function certificateAssetRoute(
  templateId: string,
  assetId: string,
): string {
  return `/api/v1/certificate-templates/${templateId}/assets/${assetId}`;
}

/** Asset ids → asset routes. */
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
    element_weights: design.element_weights ?? {},
    element_underlines: design.element_underlines ?? {},
    ...(design.title ? { title: design.title } : {}),
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

export function designAssetIds(design: StoredCertificateDesign): string[] {
  return [
    ...(design.images ?? []).map((image) => image.asset_id),
    design.frame_asset_id,
    design.seal_asset_id,
  ].filter((assetId): assetId is string => Boolean(assetId));
}
