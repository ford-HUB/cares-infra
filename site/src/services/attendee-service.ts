import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type { EventAttendee } from '../types/attendee'
import type { ApiResponse } from '../types/portal-roles'
import { mockEventAttendees } from './mock-data'

// Fixtures until the event-attendance endpoints land — the return type is already the
// portal's ApiResponse envelope, so the swap to an `apiClient` call is a body-only
// change here and nothing above the service layer moves.

/** The whole roster across events; the page groups and filters it client-side. */
export async function listEventAttendees(): Promise<ApiResponse<EventAttendee[]>> {
  await delay(MOCK_API_DELAY_MS.default)
  return { success: true, data: mockEventAttendees }
}
