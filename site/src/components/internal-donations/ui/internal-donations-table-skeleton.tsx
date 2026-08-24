import { Skeleton } from '@/components/ui/skeleton'
import { DONATION_TABLE_COLUMNS } from '../../../constants/internal-donation'

export function InternalDonationsTableSkeleton({ rows }: { rows: number }) {
  return (
    <tbody aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index}>
          {DONATION_TABLE_COLUMNS.map((column) => (
            <td key={column.key} className="h-14 border-b border-gray-100 px-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}
