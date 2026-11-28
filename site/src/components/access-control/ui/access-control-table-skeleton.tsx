import { Skeleton } from '@/components/ui/skeleton'
import {
  ACCESS_CELL_BASE,
  ACCESS_CELL_BORDER,
  ACCESS_COLUMNS,
  ACCESS_GUTTER_CELL,
} from '../../../constants/access-control'

interface AccessControlTableSkeletonProps {
  rows: number
}

function CellContent({
  columnKey,
}: {
  columnKey: (typeof ACCESS_COLUMNS)[number]['key']
}) {
  if (columnKey === 'actions') {
    return <Skeleton className="ml-auto h-5 w-5 rounded-md" />
  }

  if (columnKey === 'name') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    )
  }

  if (columnKey === 'scope') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-1.5 w-16 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    )
  }

  if (columnKey === 'rights') {
    return <Skeleton className="h-4 w-20 rounded-full" />
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/** Renders rows only, into the table's existing `<tbody>`. */
export function AccessControlTableSkeleton({
  rows,
}: AccessControlTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${ACCESS_GUTTER_CELL} ${ACCESS_CELL_BASE} px-0`} />
          {ACCESS_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${ACCESS_CELL_BORDER} ${ACCESS_CELL_BASE} ${
                column.key === 'actions' ? 'px-2 text-right' : ''
              }`}
            >
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
