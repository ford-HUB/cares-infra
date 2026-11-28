import { z } from 'zod';
import type { StoredCertificateDesign } from '../../certificate-templates/dto/certificate-templates-site-dto';
import {
  CertificateDeploymentListResponseSchema,
  CertificateDeploymentResponseSchema,
  DeployCertificateSchema,
  UpdateDeploymentStatusSchema,
} from '../validators/certificate-deployments-site-validator';

export type DeployCertificateDto = z.infer<typeof DeployCertificateSchema>;
export type UpdateDeploymentStatusDto = z.infer<
  typeof UpdateDeploymentStatusSchema
>;
export type CertificateDeploymentDto = z.infer<
  typeof CertificateDeploymentResponseSchema
>;
export type CertificateDeploymentListDto = z.infer<
  typeof CertificateDeploymentListResponseSchema
>;

export type DeployedSignatoryDto =
  CertificateDeploymentDto['design']['signatories'][number];

/** Asset ids plus copied signature lines, frozen as one document. */
export interface StoredDeploymentDesign extends StoredCertificateDesign {
  signatories: DeployedSignatoryDto[];
}
