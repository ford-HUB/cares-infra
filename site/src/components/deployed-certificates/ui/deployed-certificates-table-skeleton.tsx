import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors a table row cell for cell, so the swap causes no jump. */
export function DeployedCertificatesTableSkeleton({ rows }: { rows: number }) {
  return (
    <tbody aria-hidden className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`deployment-row-skeleton-${index}`}>
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-11 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="h-4 w-20 rounded-full" />
          </td>
          <td className="px-3 py-2.5">
            <div className="ml-auto w-40 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </td>
          <td className="px-3 py-2.5">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="ml-auto h-7 w-7 rounded-lg" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}
