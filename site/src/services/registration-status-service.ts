import { apiClient, parseApiError } from './api-client'
import type { ApiResponse } from '../types/portal-roles'
import type { RegistrationStatus } from '../types/registration-status'

interface RegistrationStatusEnvelope {
  ok: boolean
  message?: string
  data?: RegistrationStatus
}

/** Public endpoint: registrants can't sign in until approved. */
export async function fetchRegistrationStatus(
  token: string,
): Promise<ApiResponse<RegistrationStatus>> {
  try {
    const { data } = await apiClient.get<RegistrationStatusEnvelope>(
      '/api/v1/auth/registration-status',
      { params: { token } },
    )
    if (!data.ok || !data.data) {
      return {
        success: false,
        data: null,
        message: data.message ?? 'Unable to load this registration',
      }
    }
    return { success: true, data: data.data, message: data.message }
  } catch (error) {
    return { success: false, data: null, message: parseApiError(error) }
  }
}
