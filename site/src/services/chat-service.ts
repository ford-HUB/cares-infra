import type {
  ChatAttachment,
  ChatConversation,
  ChatDirectory,
  ChatMessage,
} from '../types/chat'
import type { ApiResponse } from '../types/portal-roles'
import {
  apiClient,
  parseApiError,
  toApiResponse,
} from './api-client'
import type {
  ChatAttachmentApi,
  ChatDirectoryApi,
  ChatConversationApi,
  ChatMessageApi,
} from '../types/chat-api'

function mapAttachment(data: ChatAttachmentApi): ChatAttachment {
  return {
    id: data.attachment_id,
    name: data.name,
    size: data.size,
    mimeType: data.mime_type,
  }
}

export function mapChatMessage(data: ChatMessageApi): ChatMessage {
  return {
    id: data.message_id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderRoleType: data.sender_role_type,
    body: data.body,
    sentAt: data.created_at,
    attachments: data.attachments.map(mapAttachment),
  }
}

export async function fetchChatDirectory(): Promise<ApiResponse<ChatDirectory>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: ChatDirectoryApi
    }>('/api/v1/chat/contacts')

    return toApiResponse({
      contacts: body.data.contacts.map((contact) => ({
        id: contact.user_id,
        firstName: contact.firstname,
        lastName: contact.lastname,
        email: contact.email,
        roleType: contact.role_type,
        department: contact.department,
      })),
      threads: body.data.threads.map((thread) => ({
        contactId: thread.contact_id,
        conversationId: thread.conversation_id,
        preview: thread.preview,
        lastMessageAt: thread.last_message_at,
        unread: thread.unread,
      })),
    })
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function fetchChatConversation(
  contactId: string,
): Promise<ApiResponse<ChatConversation>> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: ChatConversationApi
    }>(`/api/v1/chat/conversations/${contactId}/messages`)

    return toApiResponse({
      contactId: body.data.contact_id,
      conversationId: body.data.conversation_id,
      messages: body.data.messages.map(mapChatMessage),
    })
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Multipart so the S3 upload and the message land in one request. */
export async function sendChatMessage(
  contactId: string,
  body: string,
  files: File[],
): Promise<ApiResponse<ChatMessage>> {
  try {
    const form = new FormData()
    form.append('body', body)
    files.forEach((file) => form.append('files', file))

    const { data } = await apiClient.post<{ ok: true; data: ChatMessageApi }>(
      `/api/v1/chat/conversations/${contactId}/messages`,
      form,
    )

    return toApiResponse(mapChatMessage(data.data))
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function markConversationRead(
  contactId: string,
): Promise<ApiResponse<null>> {
  try {
    await apiClient.post(`/api/v1/chat/conversations/${contactId}/read`)
    return { success: true, data: null }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Attachments are private in S3, so they are streamed through the API. */
export function chatAttachmentPath(attachmentId: string): string {
  return `/api/v1/chat/attachments/${attachmentId}`
}
