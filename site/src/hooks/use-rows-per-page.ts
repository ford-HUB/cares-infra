import { useEffect, useState, type RefObject } from 'react'

interface RowsPerPageLayout {
  rowsPerPage: number
  remainder: number
}

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
