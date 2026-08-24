import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  USER_CELL_BASE,
  USER_CELL_BORDER,
  USER_COLUMNS,
  USER_GUTTER_CELL,
  USER_HEADER_HEIGHT_PX,
  USER_ROW_HEIGHT_PX,
} from '../../constants/manage-users'
import { useRowsPerPage } from '../../hooks/use-rows-per-page'
import type { ManagedUser } from '../../types/manage-users'
import { TablePagination } from '../portal/ui/table-pagination'
import { UserAvatar } from '../portal/ui/user-avatar'
import { ManageUsersTableSkeleton } from './ui/manage-users-table-skeleton'
import { UserActionsMenu } from './ui/user-actions-menu'
import { UserStatusBadge } from './ui/user-status-badge'

interface ManageUsersTableProps {
  users: ManagedUser[]
  loading: boolean
  /** False until the first fetch settles — see `manage-users-store`. */
  initialized: boolean
  page: number
  onPageChange: (page: number) => void
  onView: (user: ManagedUser) => void
  onRestrict: (user: ManagedUser) => void
  onUnrestrict: (user: ManagedUser) => void
  onBlockIp: (user: ManagedUser) => void
  onUnblockIp: (user: ManagedUser) => void
  onReissueCredentials?: (user: ManagedUser) => void
}

const cellBorder = USER_CELL_BORDER
const cellBase = USER_CELL_BASE
const gutter = USER_GUTTER_CELL

export function ManageUsersTable({
  users,
  loading,
  initialized,
  page,
  onPageChange,
  onView,
  onRestrict,
  onUnrestrict,
  onBlockIp,
  onUnblockIp,
  onReissueCredentials,
}: ManageUsersTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    USER_ROW_HEIGHT_PX,
    USER_HEADER_HEIGHT_PX,
  )

  // Covers the mount render too, where `loading` has not flipped true yet. A refilter
  // or refetch keeps existing rows on screen instead of blanking the grid.
  const showSkeleton = !initialized || (loading && users.length === 0)

  const totalPages = Math.max(1, Math.ceil(users.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const rows = users.slice(start, start + rowsPerPage)
  const fillers = Array.from({ length: Math.max(0, rowsPerPage - rows.length) })

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages)
  }, [page, totalPages, onPageChange])

  return (
    <div
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto"
      >
        <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className={`${gutter} z-30 h-9 border-b border-gray-200 px-0 font-semibold`}
              >
                #
              </th>
              {USER_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${cellBorder} ${column.width} h-9 border-b border-gray-200 bg-gray-50 px-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {showSkeleton && <ManageUsersTableSkeleton rows={rowsPerPage} />}

            {!showSkeleton && users.length === 0 && (
              <tr>
                <td
                  colSpan={USER_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  No users match the current filters.
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((user, index) => (
                <tr
                  key={user.id}
                  tabIndex={0}
                  onClick={() => onView(user)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onView(user)
                    }
                  }}
                  className="cursor-pointer outline-none odd:bg-gray-50/40 hover:bg-green-50/60 focus-visible:bg-green-50/60"
                >
                  <td className={`${gutter} ${cellBase} px-0`}>{start + index + 1}</td>

                  <td className={`${cellBorder} ${cellBase}`}>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar firstName={user.firstName} lastName={user.lastName} />
                      <span className="truncate font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600`} title={user.email}>
                    {user.email}
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600 capitalize`}>
                    {user.role}
                  </td>

                  <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                    {user.department ?? 'N/A'}
                  </td>

                  <td className={`${cellBorder} ${cellBase} font-mono text-gray-600`}>
                    {user.lastLoginIp ?? '—'}
                    {user.blockedIps.length > 0 && (
                      <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700">
                        blocked
                      </span>
                    )}
                  </td>

                  <td className={`${cellBorder} ${cellBase}`}>
                    <UserStatusBadge status={user.status} />
                  </td>

                  <td className={`${cellBorder} ${cellBase} overflow-visible px-2 text-right`}>
                    <UserActionsMenu
                      user={user}
                      onView={onView}
                      onRestrict={onRestrict}
                      onUnrestrict={onUnrestrict}
                      onBlockIp={onBlockIp}
                      onUnblockIp={onUnblockIp}
                      onReissueCredentials={onReissueCredentials}
                    />
                  </td>
                </tr>
              ))}

            {!showSkeleton &&
              users.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {USER_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && users.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {USER_COLUMNS.map((column) => (
                  <td key={column.key} className={`${cellBorder} p-0`} />
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
        {showSkeleton ? (
          <Skeleton className="h-3 w-40" />
        ) : (
          <p className="text-[12px] text-gray-500">
            {users.length === 0
              ? 'No users to show'
              : `Showing ${start + 1}–${start + rows.length} of ${users.length}`}
          </p>
        )}

        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}
