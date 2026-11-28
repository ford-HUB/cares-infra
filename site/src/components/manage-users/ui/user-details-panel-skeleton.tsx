import { Skeleton } from '@/components/ui/skeleton'

/** Field counts of the loaded panel's first sections, so heights match. */
const SECTIONS = [
  { title: 'Personal', fields: 5 },
  { title: 'Address', fields: 5 },
  { title: 'Account', fields: 8 },
]

/** Section headings stay real text; they're known before the data arrives. */
export function UserDetailsPanelSkeleton() {
  return (
    <div aria-busy>
      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="border-b border-gray-100 px-5 py-4 last:border-b-0"
        >
          <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            {section.title}
          </h4>
          <div aria-hidden>
            {Array.from({ length: section.fields }, (_, index) => (
              // h-7 = the loaded Field's 20px line-height plus its py-1.
              <div key={index} className="flex h-7 items-center justify-between gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
