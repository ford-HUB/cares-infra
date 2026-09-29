import { z } from 'zod';
import {
  CertificateDesignSchema,
  CertificateTemplateListResponseSchema,
  CertificateTemplateResponseSchema,
  CreateCertificateTemplateSchema,
  DeleteCertificateTemplateResponseSchema,
  SaveCertificateTemplateSchema,
  SignatoryCoordinatorListResponseSchema,
  SignatoryCoordinatorResponseSchema,
} from '../validators/certificate-templates-site-validator';

export type CertificateDesignDto = z.infer<typeof CertificateDesignSchema>;
export type SaveCertificateTemplateDto = z.infer<
  typeof SaveCertificateTemplateSchema
>;
export type CreateCertificateTemplateDto = z.infer<
  typeof CreateCertificateTemplateSchema
>;
export type CertificateTemplateDto = z.infer<
  typeof CertificateTemplateResponseSchema
>;
export type CertificateTemplateListDto = z.infer<
  typeof CertificateTemplateListResponseSchema
>;
export type SignatoryCoordinatorDto = z.infer<
  typeof SignatoryCoordinatorResponseSchema
>;
export type SignatoryCoordinatorListDto = z.infer<
  typeof SignatoryCoordinatorListResponseSchema
>;
export type DeleteCertificateTemplateDto = z.infer<
  typeof DeleteCertificateTemplateResponseSchema
>;

/**
 * The design as it is stored: identical to what the portal sends, except every
 * imported file has been replaced by the id of its `CertificateTemplateAsset` row. The
 * bytes are in S3 and the row is the only handle on them, so nothing in the JSON is a
 * URL that could go stale when the bucket or region changes.
 */
export interface StoredCertificateDesign extends Omit<
  CertificateDesignDto,
  'images' | 'frame_svg_url' | 'seal_svg_url'
> {
  frame_asset_id?: string;
  seal_asset_id?: string;
  images: StoredCertificateImage[];
}

export interface StoredCertificateImage {
  id: string;
  asset_id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: CertificateDesignDto['images'][number]['shape'];
  z: number;
}
