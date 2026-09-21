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

/** A deployed signature line plus the image it was issued with. */
export interface StoredIssuedSignatory {
  id: string;
  coordinator_id: string;
  name: string;
  title: string;
  department: string;
  /** S3 key/URL of the coordinator's signature on the day; null when they had none. */
  signature_key: string | null;
}

/**
 * What an issued certificate's `design` column holds: the deployment's frozen design,
 * placeholders left as tokens (the row's own columns carry the values), and the
 * signature lines pinned to the images they printed with.
 */
export interface StoredIssuedDesign extends Omit<
  StoredDeploymentDesign,
  'signatories'
> {
  /** The template whose assets the frame, seal and images still live with. */
  template_id: string;
  signatories: StoredIssuedSignatory[];
}
