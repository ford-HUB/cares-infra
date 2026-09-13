import { useMemo, useState } from 'react'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
  formatReportPeriod,
} from '../../constants/monthly-report'
import type {
  LibraryFolder,
  MonthlyReport,
  ReportDepartment,
  ReportMetrics,
} from '../../types/monthly-report'
import { DepartmentChip } from './ui/department-chip'
import { ReportFileList } from './ui/report-file-list'
import { ReportFolderTile } from './ui/report-folder-tile'
import { ReportLibrarySkeleton } from './ui/report-library-skeleton'

interface DepartmentFilesBoardProps {
  /** Approved reports only — the filed record, nothing still under review. */
  reports: MonthlyReport[]
  /** Period in view, or null when the board spans every period. */
  period: string | null
  /** The coordinator's own college, listed first when known. */
  ownDepartment: ReportDepartment | null
  initialized: boolean
  onOpenDocument: (report: MonthlyReport, documentId: string) => void
}

function sumMetrics(reports: MonthlyReport[]): ReportMetrics {
  return reports.reduce<ReportMetrics>(
    (total, report) => ({
      events: total.events + report.metrics.events,
      volunteers: total.volunteers + report.metrics.volunteers,
      serviceHours: total.serviceHours + report.metrics.serviceHours,
      beneficiaries: total.beneficiaries + report.metrics.beneficiaries,
    }),
    { events: 0, volunteers: 0, serviceHours: 0, beneficiaries: 0 },
  )
}

/**
 * The coordinator's reading of the library: one folder per college holding the
 * approved report records, and nothing else. There is no filing here — folders are
 * derived from each report's department, and only the director moves things around.
 */
export function DepartmentFilesBoard({
  reports,
  period,
  ownDepartment,
  initialized,
  onOpenDocument,
}: DepartmentFilesBoardProps) {
  const [openDepartment, setOpenDepartment] = useState<ReportDepartment | null>(null)

  const folders = useMemo<LibraryFolder[]>(() => {
    // Own college first so a coordinator lands on their own records.
    const order = ownDepartment
      ? [ownDepartment, ...DEPARTMENT_ORDER.filter((one) => one !== ownDepartment)]
      : DEPARTMENT_ORDER

    return order
      .map((department) => {
        const inFolder = reports.filter((report) => report.department === department)
        return {
          id: `department:${department}`,
          name: DEPARTMENT_LABELS[department],
          kind: 'department' as const,
          department,
          reports: inFolder,
          metrics: sumMetrics(inFolder),
        }
      })
      .filter((folder) => folder.reports.length > 0)
  }, [reports, ownDepartment])

  const openFolder = folders.find((folder) => folder.department === openDepartment) ?? null

  if (!initialized) return <ReportLibrarySkeleton />

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {openFolder ? (
          <button
            type="button"
            onClick={() => setOpenDepartment(null)}
            className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="min-w-0">
              <span className="block text-[11px] tracking-wider text-gray-400 uppercase">
                All departments
              </span>
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-gray-900">
                {openFolder.department && (
                  <DepartmentChip department={openFolder.department} />
                )}
                <span className="truncate">{openFolder.name}</span>
                <span className="font-normal text-gray-400 tabular-nums">
                  · {openFolder.reports.length} report
                  {openFolder.reports.length === 1 ? '' : 's'}
                </span>
              </span>
            </span>
          </button>
        ) : (
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">
            Department folders ({folders.length})
          </p>
        )}

        <p className="text-[11px] text-gray-400">
          {period ? formatReportPeriod(period) : 'All reporting periods'} · read-only
        </p>
      </div>

      {!openFolder && folders.length > 0 && (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {folders.map((folder) => (
            <ReportFolderTile
              key={folder.id}
              folder={folder}
              onOpen={(one) => setOpenDepartment(one.department ?? null)}
            />
          ))}
        </div>
      )}

      {(openFolder ? openFolder.reports.length === 0 : folders.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white px-6 py-14 text-center ring-1 ring-gray-200">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <FolderOpen className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-medium text-gray-700">No records filed yet</p>
          <p className="max-w-sm text-[12px] text-gray-500">
            {period
              ? `No report for ${formatReportPeriod(period)} has been approved yet.`
              : 'A report is filed under its department once the director approves it.'}
          </p>
        </div>
      ) : (
        openFolder && (
          <ReportFileList reports={openFolder.reports} onOpenDocument={onOpenDocument} />
        )
      )}
    </div>
  )
}
