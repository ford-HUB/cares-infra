import dayjs from 'dayjs'
import { Eye } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ANSWER_CELL_BASE,
  ANSWER_CELL_BORDER,
  ANSWER_COLUMNS,
  ANSWER_GUTTER_CELL,
  ANSWER_HEADER_HEIGHT_PX,
  ANSWER_ROW_HEIGHT_PX,
  ANSWER_SUBMITTED_AT_FORMAT,
} from '../../constants/evaluation'
import { useRowsPerPage } from '../../hooks/use-rows-per-page'
import type { EvaluationResponse } from '../../types/evaluation'
import { TablePagination } from '../portal/ui/table-pagination'
import { UserAvatar } from '../portal/ui/user-avatar'
import { AnswerStatusBadge } from './ui/answer-status-badge'
import { AnswersTableSkeleton } from './ui/answers-table-skeleton'
import { StarRating } from './ui/star-rating'

interface AnswersTableProps {
  responses: EvaluationResponse[]
  loading: boolean
  initialized: boolean
  page: number
  /** Max stars on the rating question, so a 4 reads as 4 of 5 and not 4 of 10. */
  ratingMax: number
  onPageChange: (page: number) => void
  onView: (response: EvaluationResponse) => void
}

const cellBorder = ANSWER_CELL_BORDER
const cellBase = ANSWER_CELL_BASE
const gutter = ANSWER_GUTTER_CELL

/** The participants' submissions, one per row, with their star rating on the row. */
export function AnswersTable({
  responses,
  loading,
  initialized,
  page,
  ratingMax,
  onPageChange,
  onView,
}: AnswersTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rowsPerPage, remainder } = useRowsPerPage(
    scrollRef,
    ANSWER_ROW_HEIGHT_PX,
    ANSWER_HEADER_HEIGHT_PX,
  )

  const showSkeleton = !initialized || (loading && responses.length === 0)

  const totalPages = Math.max(1, Math.ceil(responses.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * rowsPerPage
  const rows = responses.slice(start, start + rowsPerPage)
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
              {ANSWER_COLUMNS.map((column) => (
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
            {showSkeleton && <AnswersTableSkeleton rows={rowsPerPage} />}

            {!showSkeleton && responses.length === 0 && (
              <tr>
                <td
                  colSpan={ANSWER_COLUMNS.length + 1}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  No responses match the current filters.
                </td>
              </tr>
            )}

            {!showSkeleton &&
              rows.map((response, index) => {
                const { participant } = response
                return (
                  <tr
                    key={response.id}
                    tabIndex={0}
                    onClick={() => onView(response)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onView(response)
                      }
                    }}
                    className="cursor-pointer outline-none odd:bg-gray-50/40 hover:bg-green-50/60 focus-visible:bg-green-50/60"
                  >
                    <td className={`${gutter} ${cellBase} px-0`}>{start + index + 1}</td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          firstName={participant.firstName}
                          lastName={participant.lastName}
                        />
                        <span className="truncate font-medium text-gray-900">
                          {participant.firstName} {participant.lastName}
                        </span>
                      </div>
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={participant.email}
                    >
                      {participant.email}
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600`}>
                      {participant.department ?? 'N/A'}
                    </td>

                    <td
                      className={`${cellBorder} ${cellBase} text-gray-600`}
                      title={response.event}
                    >
                      {response.event}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <StarRating value={response.rating} max={ratingMax} showValue />
                    </td>

                    <td className={`${cellBorder} ${cellBase} text-gray-600 tabular-nums`}>
                      {dayjs(response.submittedAt).format(ANSWER_SUBMITTED_AT_FORMAT)}
                    </td>

                    <td className={`${cellBorder} ${cellBase}`}>
                      <AnswerStatusBadge status={response.status} />
                    </td>

                    <td className={`${cellBorder} ${cellBase} px-2 text-right`}>
                      <button
                        type="button"
                        aria-label={`View answers from ${participant.firstName} ${participant.lastName}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onView(response)
                        }}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}

            {!showSkeleton &&
              responses.length > 0 &&
              fillers.map((_, index) => (
                <tr key={`filler-${index}`} aria-hidden className="odd:bg-gray-50/40">
                  <td className={`${gutter} ${cellBase} px-0`} />
                  {ANSWER_COLUMNS.map((column) => (
                    <td key={column.key} className={`${cellBorder} ${cellBase}`} />
                  ))}
                </tr>
              ))}

            {!showSkeleton && responses.length > 0 && remainder > 0 && (
              <tr aria-hidden style={{ height: remainder }} className="odd:bg-gray-50/40">
                <td className={`${gutter} p-0`} />
                {ANSWER_COLUMNS.map((column) => (
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
            {responses.length === 0
              ? 'No responses to show'
              : `Showing ${start + 1}–${start + rows.length} of ${responses.length}`}
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
