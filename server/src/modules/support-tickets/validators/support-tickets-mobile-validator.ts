import { z } from 'zod';
import {
  RoleType,
  SupportTicketAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../infastructures/prisma/common/client';

/** The app's role switcher is local, so every mobile side files into one queue. */
export const MOBILE_SUPPORT_TICKET_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

export const SUPPORT_TICKET_SUBJECT_MAX = 120;
export const SUPPORT_TICKET_DESCRIPTION_MAX = 4000;
export const SUPPORT_TICKET_REPLY_MAX = 2000;

/**
 * Priority is not accepted from the app: the portal triages by three buckets and
 * the bucket follows from the type, so the mapping lives in the service.
 */
export const CreateSupportTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(SUPPORT_TICKET_SUBJECT_MAX),
    description: z
      .string()
      .trim()
      .min(10, 'Tell us a little more (at least 10 characters)')
      .max(SUPPORT_TICKET_DESCRIPTION_MAX),
    type: z.enum(SupportTicketType),
  })
  .strict();

export const RequesterReplySchema = z
  .object({ body: z.string().trim().min(1).max(SUPPORT_TICKET_REPLY_MAX) })
  .strict();

/**
 * Answer to "did the fix work?" on a ticket under verification. A "no" needs a
 * word from the requester so the thread says what is still wrong.
 */
export const ConfirmSupportTicketFixSchema = z
  .object({
    fixed: z.boolean(),
    body: z.string().trim().min(1).max(SUPPORT_TICKET_REPLY_MAX).optional(),
  })
  .strict()
  .refine((value) => value.fixed || value.body !== undefined, {
    message: 'Tell us what is still not working',
    path: ['body'],
  });

export const MobileSupportTicketReplySchema = z.object({
  support_ticket_reply_id: z.string(),
  author_name: z.string(),
  author_type: z.enum(SupportTicketAuthorType),
  body: z.string(),
  created_at: z.iso.datetime(),
});

/** The requester's view: no requester block (it is them) and no assignee id. */
export const MobileSupportTicketSchema = z.object({
  support_ticket_id: z.string(),
  reference_number: z.number(),
  subject: z.string(),
  description: z.string(),
  type: z.enum(SupportTicketType),
  status: z.enum(SupportTicketStatus),
  priority: z.enum(SupportTicketPriority),
  assignee_name: z.string().nullable(),
  replies: z.array(MobileSupportTicketReplySchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const MobileSupportTicketListResponseSchema = z.object({
  items: z.array(MobileSupportTicketSchema),
});

export const MobileSupportTicketResponseSchema = MobileSupportTicketSchema;
