import {
  NEED_PRIORITY_ORDER,
  NEED_PRIORITY_THRESHOLDS,
  UNSPECIFIED_BARANGAY,
} from '../constants/residential-needs'
import type { Household, NeedPriority } from '../types/residential-needs'

export function needPriorityOf(seriousness: number): NeedPriority {
  return (
    NEED_PRIORITY_ORDER.find((band) => seriousness >= NEED_PRIORITY_THRESHOLDS[band]) ?? 'low'
  )
}

export function householdPriority(household: Household): NeedPriority {
  return needPriorityOf(household.survey.seriousness)
}

/** Alphabetical, with no-barangay rows last. */
export function householdBarangays(households: Household[]): string[] {
  const names = [...new Set(households.map((h) => h.barangay))]
  return names.sort((a, b) => {
    if (a === UNSPECIFIED_BARANGAY) return 1
    if (b === UNSPECIFIED_BARANGAY) return -1
    return a.localeCompare(b)
  })
}
