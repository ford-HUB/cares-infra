import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { MonthlyReportToolbar } from '../../components/monthly-report/monthly-report-toolbar'
import { ReportLibrary } from '../../components/monthly-report/report-library'
import { DocumentPreviewModal } from '../../components/monthly-report/ui/document-preview-modal'
import { ReportFetchError } from '../../components/monthly-report/ui/report-fetch-error'
import { PERIOD_FILTER_ALL } from '../../constants/monthly-report'
import { useMonthlyReportScope } from '../../hooks/use-monthly-report-scope'
import { useMonthlyReportStore } from '../../store/monthly-report-store'
import type {
  LibraryFolder,
  MonthlyReport,
  ReportMetrics,
} from '../../types/monthly-report'

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
 * The filed set. A report lands under its college the moment the director approves it
 * in Queue Reviewer; folders on top of that are the director's own — named for
 * whatever the packet is for, and holding reports from any department.
 */
export function MonthlyReportsPage() {
  const {
    reports,
    scoped,
    periods,
    period,
    setPeriod,
    search,
    setSearch,
    initialized,
    error,
    fetchReports,
  } = useMonthlyReportScope()

  const folders = useMonthlyReportStore((s) => s.folders)
  const createFolder = useMonthlyReportStore((s) => s.createFolder)
  const renameFolder = useMonthlyReportStore((s) => s.renameFolder)
  const removeFolder = useMonthlyReportStore((s) => s.removeFolder)
  const moveToFolder = useMonthlyReportStore((s) => s.moveToFolder)

  const [preview, setPreview] = useState<{
    report: MonthlyReport
    documentId: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const approved = useMemo(
    () =>
      scoped
        .filter((report) => report.status === 'approved')
        .sort((a, b) => b.period.localeCompare(a.period)),
    [scoped],
  )

  const totals = useMemo(() => sumMetrics(approved), [approved])

  const runMutation = async (action: () => Promise<void>, message: string) => {
    setSaving(true)
    try {
      await action()
      toast.success(message)
    } catch {
      toast.error('The folder could not be updated')
    } finally {
      setSaving(false)
    }
  }

  const handleMove = (report: MonthlyReport, folderId: string | null) => {
    const target = folders.find((folder) => folder.id === folderId)
    void runMutation(
      () => moveToFolder(report.id, folderId),
      folderId && target
        ? `${report.reference} filed in "${target.name}"`
        : `${report.reference} moved back to ${report.department}`,
    )
  }

  const handleDeleteFolder = (folder: LibraryFolder) =>
    void runMutation(
      () => removeFolder(folder.id),
      folder.reports.length > 0
        ? `"${folder.name}" deleted — its reports are back under their department`
        : `"${folder.name}" deleted`,
    )

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <MonthlyReportToolbar
        title="Monthly Report"
        description="Approved reports, filed under their college. Add folders of your own for anything you need to pull together."
        noun="approved"
        search={search}
        period={period}
        periods={periods}
        shown={approved.length}
        total={reports.filter((report) => report.status === 'approved').length}
        initialized={initialized}
        onSearchChange={setSearch}
        onPeriodChange={setPeriod}
      />

      {error && <ReportFetchError message={error} onRetry={() => void fetchReports()} />}

      <ReportLibrary
        reports={approved}
        folders={folders}
        totals={totals}
        period={period === PERIOD_FILTER_ALL ? null : period}
        initialized={initialized}
        saving={saving}
        onOpenDocument={(report, documentId) => setPreview({ report, documentId })}
        onCreateFolder={(name) =>
          void runMutation(() => createFolder(name), `Folder "${name}" created`)
        }
        onRenameFolder={(id, name) =>
          void runMutation(() => renameFolder(id, name), `Folder renamed to "${name}"`)
        }
        onDeleteFolder={handleDeleteFolder}
        onMove={handleMove}
      />

      {preview && (
        <DocumentPreviewModal
          key={preview.documentId}
          report={preview.report}
          initialDocumentId={preview.documentId}
          onClose={() => setPreview(null)}
        />
      )}
    </ContentShell>
  )
}
