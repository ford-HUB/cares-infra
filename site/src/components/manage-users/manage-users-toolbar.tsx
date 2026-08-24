import { Download, Search, UserPlus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  USER_ROLE_FILTER_ALL,
  USER_STATUS_FILTERS,
  type UserStatusFilter,
} from '../../constants/manage-users'

interface ManageUsersToolbarProps {
  search: string
  role: string
  status: UserStatusFilter
  roles: string[]
  shown: number
  total: number
  active: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0 users". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onRoleChange: (value: string) => void
  onStatusChange: (value: UserStatusFilter) => void
  onExport: () => void
  /** Undefined for a caller who cannot provision accounts — the button is then hidden. */
  onAddUser?: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 capitalize focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function ManageUsersToolbar({
  search,
  role,
  status,
  roles,
  shown,
  total,
  active,
  initialized,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onExport,
  onAddUser,
}: ManageUsersToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Master</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {shown} of {total} users
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {active} active
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name or email"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by role"
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
          className={selectClass}
        >
          <option value={USER_ROLE_FILTER_ALL}>All Roles</option>
          {roles.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as UserStatusFilter)}
          className={selectClass}
        >
          {USER_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onExport}
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>

        {onAddUser && (
          <button
            type="button"
            onClick={onAddUser}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] text-white transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </button>
        )}
      </div>
    </div>
  )
}
