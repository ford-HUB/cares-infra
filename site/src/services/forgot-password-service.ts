import { isAxiosError } from 'axios'
import { apiClient, parseApiError } from './api-client'
import type { BackendError } from '../types/auth'

interface ForgotPasswordEnvelope {
  ok: boolean
  message?: string
  data?: { email: string; expires_in_seconds: number; retry_after_seconds: number }
}

export interface ForgotPasswordResult {
  success: boolean
  message: string
  /** Seconds before the server will accept another request for this email. */
  retryAfterSeconds?: number
  /** True when the server refused because a link was sent too recently. */
  rateLimited?: boolean
}

/** Asks the server to mail a single-use reset link to a portal account. */
export async function requestPortalPasswordReset(
  email: string,
): Promise<ForgotPasswordResult> {
  try {
    const { data } = await apiClient.post<ForgotPasswordEnvelope>(
      '/api/v1/auth/admin/forgot-password',
      { email },
    )
    if (!data.ok) {
      return { success: false, message: data.message ?? 'Unable to send reset link' }
    }
    const minutes = data.data ? Math.round(data.data.expires_in_seconds / 60) : 15
    return {
      success: true,
      message: `A reset link has been sent to ${data.data?.email ?? email}. It expires in ${minutes} minutes.`,
      retryAfterSeconds: data.data?.retry_after_seconds,
    }
  } catch (error) {
    const rateLimited =
      isAxiosError<BackendError>(error) && error.response?.status === 429
    return { success: false, message: parseApiError(error), rateLimited }
  }
}
