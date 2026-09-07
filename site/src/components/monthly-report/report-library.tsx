import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FolderOpen, FolderPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatNumber } from '../../constants/formatting'
import {
  DEPARTMENT_BAR_STYLES,
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
  formatReportPeriod,
} from '../../constants/monthly-report'
import type {
  LibraryFolder,
  MonthlyReport,
  ReportFolder,
  ReportMetrics,
} from '../../types/monthly-report'
import { FolderNameModal } from './ui/folder-name-modal'
import { ReportFileList } from './ui/report-file-list'
import { ReportFolderTile } from './ui/report-folder-tile'
import { ReportLibrarySkeleton } from './ui/report-library-skeleton'

interface ReportLibraryProps {
  /** Approved reports only — nothing files here until the director signs off. */
  reports: MonthlyReport[]
  folders: ReportFolder[]
  totals: ReportMetrics
  /** Period in view, or null when the library spans every period. */
  period: string | null
  initialized: boolean
  saving: boolean
  onOpenDocument: (report: MonthlyReport, documentId: string) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (folder: LibraryFolder) => void
  onMove: (report: MonthlyReport, folderId: string | null) => void
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] tracking-wider text-gray-500 uppercase">
        {label}
      </p>
      <p className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  )
}

/**
 * Where approved reports live. Filing is automatic — a report sits under its college
 * the moment it is approved — and the director can lift any of them onto a folder of
 * their own, named whatever the packet is for, without changing which college it
 * counts for.
 */
export function ReportLibrary({
  reports,
  folders,
  totals,
  period,
  initialized,
  saving,
  onOpenDocument,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMove,
}: ReportLibraryProps) {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [naming, setNaming] = useState<
    { mode: 'create' } | { mode: 'rename'; folder: LibraryFolder } | null
  >(null)

  /** A report belongs to at most one folder, so this is the whole assignment map. */
  const folderOf = useMemo(() => {
    const map = new Map<string, string>()
    folders.forEach((folder) =>
      folder.reportIds.forEach((reportId) => map.set(reportId, folder.id)),
    )
    return map
  }, [folders])

  const customFolders = useMemo<LibraryFolder[]>(
    () =>
      folders.map((folder) => {
        const inFolder = reports.filter((report) => folderOf.get(report.id) === folder.id)
        return {
          id: folder.id,
          name: folder.name,
          kind: 'custom' as const,
          reports: inFolder,
          metrics: sumMetrics(inFolder),
        }
      }),
    [folders, reports, folderOf],
  )

  // A college folder only holds what the director has not filed elsewhere, so a
  // report is never listed twice across the library.
  const departmentFolders = useMemo<LibraryFolder[]>(
    () =>
      DEPARTMENT_ORDER.map((department) => {
        const inFolder = reports.filter(
          (report) => report.department === department && !folderOf.has(report.id),
        )
        return {
          id: `department:${department}`,
          name: DEPARTMENT_LABELS[department],
          kind: 'department' as const,
          department,
          reports: inFolder,
          metrics: sumMetrics(inFolder),
        }
      }).filter((folder) => folder.reports.length > 0),
    [reports, folderOf],
  )

  // Director-made shelves first — they are the ones someone chose to build.
  const libraryFolders = [...customFolders, ...departmentFolders]
  const openFolder = libraryFolders.find((folder) => folder.id === openFolderId) ?? null

  const share = (value: number) =>
    totals.serviceHours > 0 ? value / totals.serviceHours : 0

  if (!initialized) return <ReportLibrarySkeleton />

  const files = openFolder ? openFolder.reports : reports

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <Card size="sm" className="shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-60 lg:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Approved &amp; filed
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {reports.length}
                </span>
                <span className="text-[13px] text-gray-400">
                  in {libraryFolders.length} folder
                  {libraryFolders.length === 1 ? '' : 's'}
                </span>
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {period ? formatReportPeriod(period) : 'All reporting periods'}
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Events" value={formatNumber(totals.events)} />
              <Figure label="Volunteers" value={formatNumber(totals.volunteers)} />
              <Figure label="Service hours" value={formatNumber(totals.serviceHours)} />
              <Figure label="Beneficiaries" value={formatNumber(totals.beneficiaries)} />
            </div>

            {/* Service hours are the one figure every college contributes to, so the
                bar shows who carried the period rather than repeating the counts. */}
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {DEPARTMENT_ORDER.map((department) => {
                const hours = sumMetrics(
                  reports.filter((report) => report.department === department),
                ).serviceHours
                if (hours === 0) return null

                return (
                  <div
                    key={department}
                    title={`${DEPARTMENT_LABELS[department]} — ${formatNumber(hours)} hours`}
                    className={cn('h-full rounded-full', DEPARTMENT_BAR_STYLES[department])}
                    style={{ width: `${share(hours) * 100}%` }}
                  />
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {openFolder ? (
          <button
            type="button"
            onClick={() => setOpenFolderId(null)}
            className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="min-w-0">
              <span className="block text-[11px] tracking-wider text-gray-400 uppercase">
                All folders
              </span>
              <span className="block truncate text-[13px] font-semibold text-gray-900">
                {openFolder.name}{' '}
                <span className="font-normal text-gray-400 tabular-nums">
                  · {openFolder.reports.length} report
                  {openFolder.reports.length === 1 ? '' : 's'}
                </span>
              </span>
            </span>
          </button>
        ) : (
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">
            Folders ({libraryFolders.length})
          </p>
        )}

        <button
          type="button"
          onClick={() => setNaming({ mode: 'create' })}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New folder
        </button>
      </div>

      {!openFolder && libraryFolders.length > 0 && (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {libraryFolders.map((folder) => (
            <ReportFolderTile
              key={folder.id}
              folder={folder}
              onOpen={(one) => setOpenFolderId(one.id)}
              onRename={(one) => setNaming({ mode: 'rename', folder: one })}
              onDelete={onDeleteFolder}
            />
          ))}
        </div>
      )}

      {/* Files show inside a folder. At the top level the library is the folders
          themselves — every approved report already sits in one of them. */}
      {(openFolder ? files.length === 0 : libraryFolders.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white px-6 py-14 text-center ring-1 ring-gray-200">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <FolderOpen className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-medium text-gray-700">
            {openFolder ? 'This folder is empty' : 'Nothing filed yet'}
          </p>
          <p className="max-w-sm text-[12px] text-gray-500">
            {openFolder
              ? 'Open All folders, then use the ⋮ on any report to move it in here.'
              : period
                ? `No report for ${formatReportPeriod(period)} has been approved yet.`
                : 'Approve a submission in Queue Reviewer and it files here under its department.'}
          </p>
        </div>
      ) : (
        openFolder && (
          <ReportFileList
            reports={files}
            folders={folders}
            folderOf={folderOf}
            onOpenDocument={onOpenDocument}
            onMove={onMove}
          />
        )
      )}

      {naming && (
        <FolderNameModal
          key={naming.mode === 'rename' ? naming.folder.id : 'create'}
          mode={naming.mode}
          initialName={naming.mode === 'rename' ? naming.folder.name : ''}
          saving={saving}
          onClose={() => setNaming(null)}
          onSubmit={(name) => {
            if (naming.mode === 'rename') onRenameFolder(naming.folder.id, name)
            else onCreateFolder(name)
            setNaming(null)
          }}
        />
      )}
    </div>
  )
}
