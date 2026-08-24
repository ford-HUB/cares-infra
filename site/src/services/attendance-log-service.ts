import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type { LiveAttendanceSnapshot } from '../types/attendance'
import type { ApiResponse } from '../types/portal-roles'
import { buildMockLiveAttendance } from './mock-data'

// Fixtures until the live-attendance endpoint lands. `Event` has no lat/lng/radius yet
// and there is no attendance model, so nothing on the server can answer this. The
// return type is already the portal's ApiResponse envelope, so the swap to an
// `apiClient` call is a body-only change here and nothing above the service moves.

/**
 * One poll of today's running event and its roster. The server decides which event is
 * "active" — the portal never picks it, so a director watching the page can't drift
 * onto a stale event.
 */
export async function getLiveAttendance(): Promise<ApiResponse<LiveAttendanceSnapshot>> {
  await delay(MOCK_API_DELAY_MS.default)
  return { success: true, data: buildMockLiveAttendance() }
}
