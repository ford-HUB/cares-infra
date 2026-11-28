import dayjs from 'dayjs'
import type { ApiResponse } from '../types/portal-roles'
import type { DailyUsage, SystemUsageRangeDays } from '../types/system-usage'

/** SAMPLE DATA: the server keeps only 24 h of CPU; replace when a daily-history endpoint lands. */

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

/** Today itself is live. */
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
