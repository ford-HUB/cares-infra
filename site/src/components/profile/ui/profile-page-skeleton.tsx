import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

interface ProfilePageSkeletonProps {
  homePath: string
}

/** Two-column field grid matching the loaded page's `grid-cols-2 gap-16`. */
function FieldGridSkeleton({ left, right }: { left: number; right: number }) {
  return (
    <div aria-hidden className="mx-4 grid grid-cols-2 gap-16">
      {[left, right].map((count, column) => (
        <div key={column} className="flex flex-col space-y-4">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="flex flex-col space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Mirrors `ProfilePage` while the profile request is in flight. The breadcrumb and
 * section headings stay real — they're route-derived, not fetched — so only the
 * account's own data reads as pending.
 */
export function ProfilePageSkeleton({ homePath }: ProfilePageSkeletonProps) {
  return (
    <div aria-busy className="mx-8 my-4 flex h-full flex-col">
      <header className="flex flex-row items-center justify-between p-4">
        <h1 className="text-xl text-gray-700">Profile</h1>
        <div className="flex space-x-2.5">
          <Link to={homePath} className="text-gray-500">
            Home
          </Link>
          <ChevronRight size={18} className="relative top-0.5" />
          <span>Profile</span>
        </div>
      </header>

      <main className="my-4 flex w-full flex-col rounded-xl border border-gray-300 bg-white">
        <div className="title flex items-center justify-between p-6">
          <h1>Profile</h1>
        </div>

        <div className="profile-header m-4 flex justify-between rounded-xl border border-gray-300">
          <div className="m-4 inline-flex items-center">
            <Skeleton aria-hidden className="mx-3 h-24 w-24 rounded-full" />
            <div className="mx-4 space-y-2.5">
              <Skeleton aria-hidden className="h-8 w-56" />
              <Skeleton aria-hidden className="h-4 w-40" />
            </div>
          </div>

          <div className="m-4 flex items-center">
            <Skeleton aria-hidden className="h-11 w-28 rounded-3xl" />
          </div>
        </div>

        <div className="personal-information m-4 flex justify-between rounded-xl border border-gray-300">
          <div className="m-4">
            <h2 className="m-3 text-xl font-semibold">Personal Information</h2>
            <FieldGridSkeleton left={3} right={2} />
          </div>
        </div>

        <div className="address m-4 rounded-xl border border-gray-300">
          <div className="m-4">
            <h2 className="m-3 text-xl font-semibold">Address</h2>
            <FieldGridSkeleton left={2} right={2} />
          </div>
        </div>
      </main>
    </div>
  )
}
