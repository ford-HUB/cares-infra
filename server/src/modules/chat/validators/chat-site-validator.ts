import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
export const CHAT_ATTACHMENT_MAX_COUNT = 5;
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_MESSAGE_PAGE_SIZE = 100;

/** Mirrors the composer's accept list in site/src/constants/chat.ts. */
export const CHAT_ALLOWED_ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
] as const;

/**
 * Sent as multipart so files ride along with the text, which is why `body` is a
 * plain string field rather than JSON.
 */
export const SendChatMessageSchema = z
  .object({
    body: z.string().trim().max(CHAT_MESSAGE_MAX_LENGTH).default(''),
  })
  .strict();

export const ChatContactSchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role_type: z.enum(RoleType),
  department: z.string().nullable(),
});

export const ChatThreadSchema = z.object({
  contact_id: z.string(),
  conversation_id: z.string(),
  preview: z.string(),
  last_message_at: z.iso.datetime(),
  unread: z.number(),
});

export const ChatDirectoryResponseSchema = z.object({
  contacts: z.array(ChatContactSchema),
  threads: z.array(ChatThreadSchema),
});

export const ChatAttachmentSchema = z.object({
  attachment_id: z.string(),
  name: z.string(),
  size: z.number(),
  mime_type: z.string(),
});

export const ChatMessageSchema = z.object({
  message_id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string(),
  /** Lets the portal decide whether an incoming message plays a sound. */
  sender_role_type: z.enum(RoleType),
  body: z.string(),
  created_at: z.iso.datetime(),
  attachments: z.array(ChatAttachmentSchema),
});

export const ChatConversationResponseSchema = z.object({
  conversation_id: z.string().nullable(),
  contact_id: z.string(),
  messages: z.array(ChatMessageSchema),
});

export const ChatReadReceiptSchema = z.object({
  conversation_id: z.string(),
  contact_id: z.string(),
  unread: z.number(),
});
