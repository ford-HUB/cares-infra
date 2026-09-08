import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { findPerformanceRange, type PerformanceRangeId } from '../constants/system-performance'
import type {
  CpuCore,
  PerformanceSample,
  PerformanceSnapshot,
  ProcessLoad,
} from '../types/system-performance'
import {
  buildMockCpuCores,
  buildMockPerformanceSnapshot,
  buildMockProcessLoad,
  buildNextPerformanceSample,
} from './mock-data'

/**
 * The metrics endpoints are not built yet, so this module synthesises the stream the
 * page charts. Swap each function for an `apiClient` call against the host agent —
 * the signatures already match what that endpoint will return.
 */
export async function fetchPerformanceSnapshot(
  rangeId: PerformanceRangeId,
): Promise<PerformanceSnapshot> {
  const range = findPerformanceRange(rangeId)
  await delay(MOCK_API_DELAY_MS.default)

  return buildMockPerformanceSnapshot(range.points, range.stepSeconds)
}

/**
 * The live tick. It takes the previous reading so the walk stays continuous across
 * ticks — the real agent will simply return its newest sample instead.
 */
export async function fetchNextPerformanceSample(
  previous: PerformanceSample,
): Promise<PerformanceSample> {
  return buildNextPerformanceSample(previous)
}

/**
 * Cores and processes are re-derived from the newest reading rather than polled
 * separately, so the analysis card can never disagree with the chart above it.
 */
export function derivePerformanceDetail(
  sample: PerformanceSample,
  vcpu: number,
): { cores: CpuCore[]; processes: ProcessLoad[] } {
  return {
    cores: buildMockCpuCores(sample, vcpu),
    processes: buildMockProcessLoad(sample),
  }
}
