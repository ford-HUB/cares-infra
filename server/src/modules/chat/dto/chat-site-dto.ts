import { z } from 'zod';
import {
  ChatAttachmentSchema,
  ChatContactSchema,
  ChatConversationResponseSchema,
  ChatDirectoryResponseSchema,
  ChatMessageSchema,
  ChatReadReceiptSchema,
  ChatThreadSchema,
  SendChatMessageSchema,
} from '../validators/chat-site-validator';

export type SendChatMessageDto = z.infer<typeof SendChatMessageSchema>;
export type ChatContactDto = z.infer<typeof ChatContactSchema>;
export type ChatThreadDto = z.infer<typeof ChatThreadSchema>;
export type ChatDirectoryDto = z.infer<typeof ChatDirectoryResponseSchema>;
export type ChatAttachmentDto = z.infer<typeof ChatAttachmentSchema>;
export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;
export type ChatConversationDto = z.infer<
  typeof ChatConversationResponseSchema
>;
export type ChatReadReceiptDto = z.infer<typeof ChatReadReceiptSchema>;
