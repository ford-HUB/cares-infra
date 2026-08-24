import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type { CalendarEvent } from '../types/calendar'
import type { ApiResponse } from '../types/portal-roles'
import { buildMockCalendarEvents } from './mock-data'

// Fixtures until the scheduled-events endpoint lands — the return type is already the
// portal's ApiResponse envelope, so swapping to an `apiClient` call is a body-only
// change here and nothing above the service layer moves.

/** Every scheduled event; the calendar slices it into month, week and day grids. */
export async function listCalendarEvents(): Promise<ApiResponse<CalendarEvent[]>> {
  await delay(MOCK_API_DELAY_MS.default)
  return { success: true, data: buildMockCalendarEvents() }
}
