import { z } from 'zod';

/** One participant's row on a deployment's recipient list. */
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

/** What a "Remind" did: how many covered participants were nudged. */
export const RemindRecipientsResponseSchema = z.object({
  deployment_id: z.string(),
  reminded: z.number().int(),
  /** Of those, how many still owe the post-event questionnaire. */
  awaiting_feedback: z.number().int(),
  /** Of those, how many still have attendance awaiting a ruling. */
  awaiting_attendance: z.number().int(),
});
