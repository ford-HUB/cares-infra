import { isAxiosError } from 'axios'
import { apiClient, parseApiError } from './api-client'
import type { BackendError } from '../types/auth'

interface ForgotPasswordEnvelope {
  ok: boolean
  message?: string
  data?: { email: string; retry_after_seconds: number }
}

export interface ForgotPasswordResult {
  success: boolean
  message: string
  /** Seconds before the server will accept another request for this email. */
  retryAfterSeconds?: number
  /** True when the server refused because a temporary password was sent too recently. */
  rateLimited?: boolean
}

/** Asks the server to generate a temporary password for a portal account and mail it. */
export async function requestPortalPasswordReset(
  email: string,
): Promise<ForgotPasswordResult> {
  try {
    const { data } = await apiClient.post<ForgotPasswordEnvelope>(
      '/api/v1/auth/admin/forgot-password',
      { email },
    )
    if (!data.ok) {
      return { success: false, message: data.message ?? 'Unable to send temporary password' }
    }
    return {
      success: true,
      message: `A temporary password has been sent to ${data.data?.email ?? email}.`,
      retryAfterSeconds: data.data?.retry_after_seconds,
    }
  } catch (error) {
    const rateLimited =
      isAxiosError<BackendError>(error) && error.response?.status === 429
    return { success: false, message: parseApiError(error), rateLimited }
  }
}
