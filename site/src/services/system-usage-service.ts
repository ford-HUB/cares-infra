import dayjs from 'dayjs'
import type { ApiResponse } from '../types/portal-roles'
import type { DailyUsage, SystemUsageRangeDays } from '../types/system-usage'

/*
 * SAMPLE DATA — CPU per day before the last 24 h only.
 *
 * Everything else on the admin's Statistics screen is live (system-performance,
 * system-services and system-diagnostics). The server, though, keeps CPU readings
 * for 24 h only, so there is no record of earlier days to chart. Until it keeps a
 * daily rollup, those days come from this deterministic fixture, and the screen
 * draws them faded and labelled "sample". Replace with an `apiClient` call when a
 * daily-history endpoint lands; the last 24 h is filled in from live data either way.
 */

/** Small seeded PRNG — the same day always produces the same reading. */
function seeded(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function sampleDay(day: dayjs.Dayjs): DailyUsage {
  const rand = seeded(Number(day.format('YYYYMMDD')))
  const weekend = day.day() === 0 || day.day() === 6
  const cpuAvg = clamp((weekend ? 18 : 36) + rand() * 14, 6, 92)
  return {
    date: day.format('YYYY-MM-DD'),
    cpuAvg: round1(cpuAvg),
    cpuPeak: round1(clamp(cpuAvg + 18 + rand() * 20, cpuAvg + 4, 98)),
    sample: true,
  }
}

/** The `rangeDays - 1` days before today, oldest first — today itself is live. */
export async function getCpuHistory(
  rangeDays: SystemUsageRangeDays,
): Promise<ApiResponse<DailyUsage[]>> {
  const today = dayjs().startOf('day')
  return {
    success: true,
    message: 'Sample data',
    data: Array.from({ length: rangeDays - 1 }, (_, i) =>
      sampleDay(today.subtract(rangeDays - 1 - i, 'day')),
    ),
  }
}
