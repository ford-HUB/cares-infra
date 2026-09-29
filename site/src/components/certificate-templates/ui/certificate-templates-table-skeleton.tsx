import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors a table row cell for cell, so the swap causes no jump. */
export function CertificateTemplatesTableSkeleton({ rows }: { rows: number }) {
  return (
    <tbody aria-hidden className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`template-row-skeleton-${index}`}>
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-11 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="h-4 w-20 rounded-full" />
          </td>
          <td className="px-3 py-2.5">
            <Skeleton className="h-4 w-16 rounded-full" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </td>
          <td className="px-3 py-2.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-8" />
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
