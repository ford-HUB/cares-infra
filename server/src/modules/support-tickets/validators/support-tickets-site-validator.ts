import { z } from 'zod';
import {
  LoginSource,
  SupportTicketAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../infastructures/prisma/common/client';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

/** Filtered client-side, so fetched whole but capped. */
export const SUPPORT_TICKETS_DEFAULT_LIMIT = 200;
export const SUPPORT_TICKETS_MAX_LIMIT = 500;

export const ListSupportTicketsQuerySchema = z
  .object({
    status: z
      .union([z.literal('all'), z.enum(SupportTicketStatus)])
      .default('all'),
    type: z.union([z.literal('all'), z.enum(SupportTicketType)]).default('all'),
    priority: z
      .union([z.literal('all'), z.enum(SupportTicketPriority)])
      .default('all'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(SUPPORT_TICKETS_MAX_LIMIT)
      .default(SUPPORT_TICKETS_DEFAULT_LIMIT),
  })
  .strict();

/** Status and note travel together. */
export const UpdateSupportTicketSchema = z
  .object({
    status: z.enum(SupportTicketStatus).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
    /** `null` unassigns; omit to keep. */
    assignee_id: z.uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== undefined ||
      value.note !== undefined ||
      value.assignee_id !== undefined,
    { message: 'Nothing to update' },
  );

export const ReplyToSupportTicketSchema = withoutPrototypeKeys(
  z
    .object({
      body: z
        .string()
        .trim()
        .min(1)
        .max(2000)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Reply cannot contain control characters',
        }),
    })
    .strict(),
);

export const SupportTicketReplySchema = z.object({
  support_ticket_reply_id: z.string(),
  author_id: z.string().nullable(),
  author_name: z.string(),
  author_type: z.enum(SupportTicketAuthorType),
  body: z.string(),
  created_at: z.iso.datetime(),
});

export const SupportTicketSchema = z.object({
  support_ticket_id: z.string(),
  /** Rendered as `Support #010`. */
  reference_number: z.number(),
  subject: z.string(),
  description: z.string(),
  type: z.enum(SupportTicketType),
  status: z.enum(SupportTicketStatus),
  priority: z.enum(SupportTicketPriority),
  requester_id: z.string(),
  requester_firstname: z.string(),
  requester_lastname: z.string(),
  requester_email: z.string(),
  requester_role_type: z.string(),
  assignee_id: z.string().nullable(),
  assignee_name: z.string().nullable(),
  source: z.enum(LoginSource),
  replies: z.array(SupportTicketReplySchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const SupportTicketListResponseSchema = z.object({
  items: z.array(SupportTicketSchema),
  /** May exceed the returned rows. */
  total: z.number(),
});

export const SupportTicketResponseSchema = SupportTicketSchema;
