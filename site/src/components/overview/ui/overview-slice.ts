/**
 * One part of a whole, as the overview charts consume it. The caller turns a count
 * bundle (community, events, attendance, reports) into these rows, so the donut, the
 * stacked bar, and the legend all read the same list in the same order.
 */
export interface OverviewSlice {
  /** Stable key — also the CSS variable the chart fill resolves through. */
  key: string
  label: string
  value: number
  color: string
}

export function sumSlices(slices: OverviewSlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0)
}
