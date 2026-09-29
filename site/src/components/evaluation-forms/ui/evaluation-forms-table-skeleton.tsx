import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the questionnaire table's seven columns while the first fetch settles. */
export function EvaluationFormsTableSkeleton({ rows }: { rows: number }) {
  return (
    <tbody aria-hidden className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`evaluation-form-row-skeleton-${index}`}>
          <td className="px-3 py-2.5">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-52" />
              <Skeleton className="h-3 w-36" />
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="h-4 w-20 rounded-full" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="ml-auto h-7 w-7 rounded-lg" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}
