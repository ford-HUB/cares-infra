import { useEffect, useState, type RefObject } from 'react'

interface RowsPerPageLayout {
  rowsPerPage: number
  /** Leftover pixels a trailing spacer row needs so the ruled grid reaches the bottom edge. */
  remainder: number
}

/**
 * Derives how many fixed-height rows fit the measured scroll container, so a table
 * fills its viewport slot exactly instead of spilling into a page scroll.
 */
export function useRowsPerPage(
  ref: RefObject<HTMLElement | null>,
  rowHeight: number,
  headerHeight: number,
): RowsPerPageLayout {
  const [layout, setLayout] = useState<RowsPerPageLayout>({
    rowsPerPage: 8,
    remainder: 0,
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const available = element.clientHeight - headerHeight
      const rowsPerPage = Math.max(1, Math.floor(available / rowHeight))
      setLayout({
        rowsPerPage,
        remainder: Math.max(0, available - rowsPerPage * rowHeight),
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rowHeight, headerHeight])

  return layout
}
