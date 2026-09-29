import { Skeleton } from '@/components/ui/skeleton'
import {
  ANSWER_CELL_BASE,
  ANSWER_CELL_BORDER,
  ANSWER_COLUMNS,
  ANSWER_GUTTER_CELL,
} from '../../../constants/evaluation'

interface AnswersTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

function CellContent({ columnKey }: { columnKey: (typeof ANSWER_COLUMNS)[number]['key'] }) {
  if (columnKey === 'actions') {
    return <Skeleton className="ml-auto h-5 w-5 rounded-md" />
  }

  if (columnKey === 'participant') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    )
  }

  if (columnKey === 'rating') {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-3.5 w-3.5 rounded-sm" />
        ))}
      </div>
    )
  }

  if (columnKey === 'status') {
    return <Skeleton className="h-5 w-16 rounded-full" />
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/** Renders into the table's existing `<tbody>` so the header and columns stay put. */
export function AnswersTableSkeleton({ rows }: AnswersTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${ANSWER_GUTTER_CELL} ${ANSWER_CELL_BASE} px-0`} />
          {ANSWER_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${ANSWER_CELL_BORDER} ${ANSWER_CELL_BASE} ${
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
