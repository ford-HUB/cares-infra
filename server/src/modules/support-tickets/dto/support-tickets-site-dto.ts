import { z } from 'zod';
import {
  ListSupportTicketsQuerySchema,
  ReplyToSupportTicketSchema,
  SupportTicketListResponseSchema,
  SupportTicketReplySchema,
  SupportTicketResponseSchema,
  UpdateSupportTicketSchema,
} from '../validators/support-tickets-site-validator';

export type ListSupportTicketsQueryDto = z.infer<
  typeof ListSupportTicketsQuerySchema
>;
export type UpdateSupportTicketDto = z.infer<typeof UpdateSupportTicketSchema>;
export type ReplyToSupportTicketDto = z.infer<
  typeof ReplyToSupportTicketSchema
>;
export type SupportTicketReplyDto = z.infer<typeof SupportTicketReplySchema>;
export type SupportTicketDto = z.infer<typeof SupportTicketResponseSchema>;
export type SupportTicketListDto = z.infer<
  typeof SupportTicketListResponseSchema
>;
