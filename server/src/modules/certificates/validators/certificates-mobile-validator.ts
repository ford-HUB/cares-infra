import { z } from 'zod';
import {
  CERTIFICATE_CATEGORIES,
  CERTIFICATE_ORIENTATIONS,
  CertificateDesignSchema,
} from '../../certificate-templates/validators/certificate-templates-site-validator';

/** `signature_url` is null when the coordinator had none on issue day. */
export const IssuedSignatorySchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  department: z.string(),
  signature_url: z.string().nullable(),
});

/** Placeholders filled, so `headline`/`body` are plain strings. `title` falls back to the template name. */
export const IssuedDesignResponseSchema = CertificateDesignSchema.omit({
  title: true,
  headline: true,
  body: true,
  frame_svg_url: true,
  seal_svg_url: true,
  images: true,
}).extend({
  title: z.string(),
  headline: z.string(),
  body: z.string(),
  frame_svg_url: z.string().optional(),
  seal_svg_url: z.string().optional(),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      name: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      shape: z.string(),
      z: z.number(),
    }),
  ),
  signatories: z.array(IssuedSignatorySchema),
});

export const IssuedCertificateResponseSchema = z.object({
  id: z.string(),
  certificate_number: z.string(),
  deployment_id: z.string(),
  event_id: z.number().int(),
  template_name: z.string(),
  category: z.enum(CERTIFICATE_CATEGORIES),
  orientation: z.enum(CERTIFICATE_ORIENTATIONS),
  recipient_name: z.string(),
  event_name: z.string(),
  event_date: z.iso.datetime(),
  hours_rendered: z.number(),
  organization: z.string(),
  headline: z.string(),
  body: z.string(),
  design: IssuedDesignResponseSchema,
  issued_at: z.iso.datetime(),
  /** Null until opened. */
  claimed_at: z.iso.datetime().nullable(),
});

export const IssuedCertificateListResponseSchema = z.object({
  certificates: z.array(IssuedCertificateResponseSchema),
});

export const IssuedCertificateIdParamSchema = z.uuid(
  'A valid certificate id is required',
);

export const IssuedSignatoryIdParamSchema = z.uuid(
  'A valid signatory id is required',
);
