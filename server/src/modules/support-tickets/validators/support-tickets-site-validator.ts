import { z } from 'zod';
import {
  LoginSource,
  SupportTicketAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../infastructures/prisma/common/client';

/**
 * The portal filters and sorts the loaded set client-side, so the list is fetched
 * whole rather than paged — capped so a runaway queue cannot ship unbounded rows.
 */
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

/**
 * Status and note travel together: a note explaining a move must not be able to land
 * without the move, or vice versa.
 */
export const UpdateSupportTicketSchema = z
  .object({
    status: z.enum(SupportTicketStatus).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
    /** `null` unassigns; omit the key to leave the assignee untouched. */
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

export const ReplyToSupportTicketSchema = z
  .object({ body: z.string().trim().min(1).max(2000) })
  .strict();

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
  /** Sequential tracking number; the portal renders it as `Support #010`. */
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
  /** Total matching rows on the server, which may exceed what was returned. */
  total: z.number(),
});

export const SupportTicketResponseSchema = SupportTicketSchema;
