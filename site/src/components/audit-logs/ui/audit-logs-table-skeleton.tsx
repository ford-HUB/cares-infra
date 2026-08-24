import { Skeleton } from '@/components/ui/skeleton'
import {
  AUDIT_CELL_BASE,
  AUDIT_CELL_BORDER,
  AUDIT_COLUMNS,
  AUDIT_GUTTER_CELL,
} from '../../../constants/audit-logs'

interface AuditLogsTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — the actor cell mirrors the name + email pairing. */
function CellContent({ columnKey }: { columnKey: (typeof AUDIT_COLUMNS)[number]['key'] }) {
  if (columnKey === 'category' || columnKey === 'outcome') {
    return <Skeleton className="h-5 w-20 rounded-full" />
  }

  if (columnKey === 'actor') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    )
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/**
 * Renders into the table's existing `<tbody>`, so the header, borders, and column
 * widths above it stay exactly where they are while rows load.
 */
export function AuditLogsTableSkeleton({ rows }: AuditLogsTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${AUDIT_GUTTER_CELL} ${AUDIT_CELL_BASE} px-0`} />
          {AUDIT_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${AUDIT_CELL_BORDER} ${AUDIT_CELL_BASE}`}
            >
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
