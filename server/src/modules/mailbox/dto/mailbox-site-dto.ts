import { z } from 'zod';
import {
  ListMailQuerySchema,
  MailAttachmentSchema,
  MailDetailSchema,
  MailListResponseSchema,
  MailSummarySchema,
  MailboxAuthorizeResponseSchema,
  MailboxConnectionResponseSchema,
  MailboxDisconnectResponseSchema,
  MailboxFolderSchema,
  MarkMailReadSchema,
  SendMailResponseSchema,
  SendMailSchema,
} from '../validators/mailbox-site-validator';

export type MailboxFolder = z.infer<typeof MailboxFolderSchema>;
export type ListMailQueryDto = z.infer<typeof ListMailQuerySchema>;
export type SendMailDto = z.infer<typeof SendMailSchema>;
export type MarkMailReadDto = z.infer<typeof MarkMailReadSchema>;

export type MailboxConnectionDto = z.infer<
  typeof MailboxConnectionResponseSchema
>;
export type MailboxAuthorizeDto = z.infer<
  typeof MailboxAuthorizeResponseSchema
>;
export type MailboxDisconnectDto = z.infer<
  typeof MailboxDisconnectResponseSchema
>;
export type MailAttachmentDto = z.infer<typeof MailAttachmentSchema>;
export type MailSummaryDto = z.infer<typeof MailSummarySchema>;
export type MailListDto = z.infer<typeof MailListResponseSchema>;
export type MailDetailDto = z.infer<typeof MailDetailSchema>;
export type SendMailResponseDto = z.infer<typeof SendMailResponseSchema>;
