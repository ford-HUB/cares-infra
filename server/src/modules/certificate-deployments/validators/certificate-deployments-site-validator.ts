import { z } from 'zod';
import {
  CERTIFICATE_CATEGORIES,
  CERTIFICATE_ORIENTATIONS,
  CertificateDesignSchema,
} from '../../certificate-templates/validators/certificate-templates-site-validator';

export const DEPLOYMENT_STATUSES = [
  'distributing',
  'scheduled',
  'paused',
  'completed',
] as const;

/**
 * The statuses a director can set by hand. `scheduled` is not among them: it is what a
 * deployment starts as while its event is still running, and it leaves that state by
 * the event finishing, not by someone choosing it.
 */
export const SETTABLE_DEPLOYMENT_STATUSES = [
  'distributing',
  'paused',
  'completed',
] as const;

export const DeployCertificateSchema = z
  .object({
    certificate_template_id: z.uuid('Pick a certificate template'),
    event_id: z.coerce.number().int().positive('Pick an event'),
  })
  .strict();

export const UpdateDeploymentStatusSchema = z
  .object({
    status: z.enum(SETTABLE_DEPLOYMENT_STATUSES),
  })
  .strict();

export const CertificateDeploymentIdParamSchema = z.uuid(
  'A valid deployment id is required',
);

/** The frozen sheet: the template's design plus the lines that signed it. */
const DeployedSignatorySchema = z.object({
  id: z.string(),
  coordinator_id: z.string(),
  name: z.string(),
  title: z.string(),
  department: z.string(),
  signature_token: z.string(),
  has_signature: z.boolean(),
});

const DeployedDesignResponseSchema = CertificateDesignSchema.extend({
  signatories: z.array(DeployedSignatorySchema),
});

const DeploymentEventResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  venue: z.string(),
  date: z.iso.datetime(),
});

export const CertificateDeploymentResponseSchema = z.object({
  id: z.string(),
  reference: z.string(),
  template_id: z.string(),
  template_name: z.string(),
  category: z.enum(CERTIFICATE_CATEGORIES),
  orientation: z.enum(CERTIFICATE_ORIENTATIONS),
  design: DeployedDesignResponseSchema,
  event: DeploymentEventResponseSchema,
  status: z.enum(DEPLOYMENT_STATUSES),
  participants: z.number().int(),
  distributed: z.number().int(),
  claimed: z.number().int(),
  deployed_at: z.iso.datetime(),
  deployed_by: z.string(),
});

export const CertificateDeploymentListResponseSchema = z.array(
  CertificateDeploymentResponseSchema,
);
