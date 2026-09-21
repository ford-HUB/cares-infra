import { z } from 'zod';
import {
  CERTIFICATE_CATEGORIES,
  CERTIFICATE_ORIENTATIONS,
  CertificateDesignSchema,
} from '../../certificate-templates/validators/certificate-templates-site-validator';

/**
 * One signature line as printed. `signature_url` is the app's route to the image the
 * line was issued with, or null when the coordinator had none uploaded on the day.
 */
export const IssuedSignatorySchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  department: z.string(),
  signature_url: z.string().nullable(),
});

/**
 * The sheet with every placeholder already filled. The asset routes on it are the
 * template's, rewritten onto the certificate's own asset route. `headline` and
 * `body` are re-declared as plain strings: the template rule insists the award text
 * still carries `{{recipient}}`, `{{event}}` and `{{date}}`, and on an issued sheet
 * those have been filled in.
 */
export const IssuedDesignResponseSchema = CertificateDesignSchema.omit({
  headline: true,
  body: true,
  frame_svg_url: true,
  seal_svg_url: true,
  images: true,
}).extend({
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
  /** The headline and body with `{{recipient}}`, `{{event}}`, … swapped in. */
  headline: z.string(),
  body: z.string(),
  design: IssuedDesignResponseSchema,
  issued_at: z.iso.datetime(),
  /** Null until the recipient opened it. */
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
