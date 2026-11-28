import { z } from 'zod';

export const CertificateRecipientResponseSchema = z.object({
  id: z.string(),
  certificate_number: z.string(),
  user_id: z.string(),
  recipient_name: z.string(),
  hours_rendered: z.number(),
  issued_at: z.iso.datetime(),
  claimed_at: z.iso.datetime().nullable(),
});

export const CertificateRecipientListResponseSchema = z.array(
  CertificateRecipientResponseSchema,
);

export const RemindRecipientsResponseSchema = z.object({
  deployment_id: z.string(),
  reminded: z.number().int(),
  awaiting_feedback: z.number().int(),
  awaiting_attendance: z.number().int(),
});
