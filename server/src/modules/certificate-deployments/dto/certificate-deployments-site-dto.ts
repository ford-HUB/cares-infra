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

/**
 * What is actually written to the deployment's `design` column: the stored template
 * design — asset ids rather than URLs — with the signature lines copied in beside it,
 * so the whole sheet is one frozen document.
 */
export interface StoredDeploymentDesign extends StoredCertificateDesign {
  signatories: DeployedSignatoryDto[];
}
