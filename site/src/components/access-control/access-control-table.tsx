import { useEffect, useRef } from 'react'
import { ShieldOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ACCESS_CELL_BASE,
  ACCESS_CELL_BORDER,
  ACCESS_COLUMNS,
  ACCESS_GUTTER_CELL,
  ACCESS_HEADER_HEIGHT_PX,
  ACCESS_ROW_HEIGHT_PX,
} from '../../constants/access-control'
import { useRowsPerPage } from '../../hooks/use-rows-per-page'
import type { AccessUser } from '../../types/access-control'
import { TablePagination } from '../portal/ui/table-pagination'
import { UserAvatar } from '../portal/ui/user-avatar'
import { AccessControlTableSkeleton } from './ui/access-control-table-skeleton'
import { AccessScopeCell } from './ui/access-scope-cell'
import { RightsBadges } from './ui/rights-badges'

interface AccessControlTableProps {
  users: AccessUser[]
  loading: boolean
  /** False until the first fetch settles — see `access-control-store`. */
  initialized: boolean
  /** True when the last fetch failed, so the empty row doesn't blame the filters. */
  errored: boolean
  /** Total gated actions in the catalog, the denominator for the scope column. */
  totalPermissions: number
  page: number
  onPageChange: (page: number) => void
  onManage: (user: AccessUser) => void
}

const cellBorder = ACCESS_CELL_BORDER
const cellBase = ACCESS_CELL_BASE
const gutter = ACCESS_GUTTER_CELL

export function AccessControlTable({
  users,
  loading,
  initialized,
  errored,
  totalPermissions,
  page,
  onPageChange,
  onManage,
}: AccessControlTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    ACCESS_ROW_HEIGHT_PX,
    ACCESS_HEADER_HEIGHT_PX,
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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[52rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className={`${gutter} z-30 h-9 border-b border-gray-200 px-0 font-semibold`}
              >
                #
              </th>
              {ACCESS_COLUMNS.map((column) => (
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
            {showSkeleton && <AccessControlTableSkeleton rows={rowsPerPage} />}

            {!showSkeleton && users.length === 0 && (
              <tr>
                <td
                  colSpan={ACCESS_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  {errored
                    ? 'Accounts could not be loaded.'
                    : 'No portal accounts match the current filters.'}
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((user, index) => (
                <tr
                  key={user.id}
                  tabIndex={0}
                  onClick={() => onManage(user)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onManage(user)
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

                  <td className={`${cellBorder} ${cellBase}`}>
                    <AccessScopeCell
                      effective={user.effectivePermissions.length}
                      total={totalPermissions}
                    />
                  </td>

                  <td className={`${cellBorder} ${cellBase}`}>
                    <RightsBadges
                      granted={user.grantedCount}
                      revoked={user.revokedCount}
                      suspended={user.suspendedCount}
                    />
                  </td>

                  <td className={`${cellBorder} ${cellBase} px-2 text-right`}>
                    <button
                      type="button"
                      aria-label={`Manage rights for ${user.firstName} ${user.lastName}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onManage(user)
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <ShieldOff className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

            {!showSkeleton &&
              users.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {ACCESS_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && users.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {ACCESS_COLUMNS.map((column) => (
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
              ? 'No accounts to show'
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
