import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { USE_MOCK_API } from './api-client'

export async function requestStaffPasswordReset(
  _email: string,
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK_API) {
    await delay(MOCK_API_DELAY_MS.forgotPassword)
    return {
      success: true,
      message:
        'If an account exists for this email, password reset instructions have been sent.',
    }
  }
  return { success: false, message: 'Backend not wired' }
}
