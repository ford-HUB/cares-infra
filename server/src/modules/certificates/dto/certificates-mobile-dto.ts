import { z } from 'zod';
import type { StoredDeploymentDesign } from '../../certificate-deployments/dto/certificate-deployments-site-dto';
import {
  IssuedCertificateListResponseSchema,
  IssuedCertificateResponseSchema,
  IssuedSignatorySchema,
} from '../validators/certificates-mobile-validator';

export type IssuedCertificateDto = z.infer<
  typeof IssuedCertificateResponseSchema
>;
export type IssuedCertificateListDto = z.infer<
  typeof IssuedCertificateListResponseSchema
>;
export type IssuedSignatoryDto = z.infer<typeof IssuedSignatorySchema>;

export interface StoredIssuedSignatory {
  id: string;
  coordinator_id: string;
  name: string;
  title: string;
  department: string;
  /** The signature on issue day; null when none. */
  signature_key: string | null;
}

/** Frozen design with placeholders as tokens and signature images pinned. */
export interface StoredIssuedDesign extends Omit<
  StoredDeploymentDesign,
  'signatories'
> {
  /** The template that owns the frame, seal and images. */
  template_id: string;
  signatories: StoredIssuedSignatory[];
}
