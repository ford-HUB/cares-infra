import { apiClient, parseApiError } from './api-client'
import type { SubmitRequestAccessPayload } from '../types/request-access'

interface AccessRequestEnvelope {
  ok: boolean
  message?: string
  data?: { delivered_to: string; attachment_count: number }
}

export async function submitRequestAccess(
  payload: SubmitRequestAccessPayload,
): Promise<{ success: boolean; message: string }> {
  const form = new FormData()
  form.append('from_email', payload.fromEmail)
  form.append('subject', payload.subject)
  form.append('body', payload.body)
  payload.attachments.forEach((file) => form.append('attachments', file))

  try {
    const { data } = await apiClient.post<AccessRequestEnvelope>(
      '/api/v1/auth/access-request',
      form,
    )
    return {
      success: data.ok,
      message: data.ok
        ? 'Your access request has been sent. An administrator will review it and email you when approved.'
        : (data.message ?? 'Unable to send your access request'),
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}
