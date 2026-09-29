import { z } from 'zod';
import {
  ConfirmSupportTicketFixSchema,
  CreateSupportTicketSchema,
  MobileSupportTicketListResponseSchema,
  MobileSupportTicketReplySchema,
  MobileSupportTicketResponseSchema,
  RequesterReplySchema,
} from '../validators/support-tickets-mobile-validator';

export type CreateSupportTicketDto = z.infer<typeof CreateSupportTicketSchema>;
export type RequesterReplyDto = z.infer<typeof RequesterReplySchema>;
export type ConfirmSupportTicketFixDto = z.infer<
  typeof ConfirmSupportTicketFixSchema
>;
export type MobileSupportTicketReplyDto = z.infer<
  typeof MobileSupportTicketReplySchema
>;
export type MobileSupportTicketDto = z.infer<
  typeof MobileSupportTicketResponseSchema
>;
export type MobileSupportTicketListDto = z.infer<
  typeof MobileSupportTicketListResponseSchema
>;
