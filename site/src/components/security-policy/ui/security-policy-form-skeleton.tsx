import { Skeleton } from '@/components/ui/skeleton'

/** Field counts per card, in the order `security-policy-form` renders them. */
const SECTION_FIELDS = [5, 4, 3, 3]

/**
 * Mirrors the form's four cards so the swap to the loaded policy causes no jump. The
 * heights match `PolicySection`'s heading, description, and field spacing.
 */
export function SecurityPolicyFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {SECTION_FIELDS.map((fields, index) => (
        <section key={index} className="rounded-xl border border-gray-300 bg-white p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-3/4" />

          <div className="mt-4 space-y-4">
            {Array.from({ length: fields }, (_, field) => (
              <div key={field} className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-40 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex gap-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </div>
  )
}
