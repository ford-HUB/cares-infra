import { MOCK_API_DELAY_MS, delay } from '../constants/durations'

export async function requestPortalPasswordReset(
  _email: string,
): Promise<{ success: boolean; message: string }> {
  await delay(MOCK_API_DELAY_MS.forgotPassword)
  return {
    success: true,
    message:
      'If an account exists for this email, password reset instructions have been sent.',
  }
}
