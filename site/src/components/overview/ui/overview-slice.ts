/** Donut, stacked bar and legend all read the same rows in the same order. */
export interface OverviewSlice {
  /** Also the CSS variable the chart fill resolves through. */
  key: string
  label: string
  value: number
  color: string
}

export function sumSlices(slices: OverviewSlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0)
}
