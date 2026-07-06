import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { USE_MOCK_API } from './api-client'
import type { SubmitRequestAccessPayload } from '../types/request-access'

export async function submitRequestAccess(
  payload: SubmitRequestAccessPayload,
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK_API) {
    await delay(MOCK_API_DELAY_MS.requestAccess)
    void payload.attachments.length
    return {
      success: true,
      message:
        'Your access request has been recorded. An administrator will review it and email you when approved.',
    }
  }
  return { success: false, message: 'Backend not wired' }
}
