import { useMemo, useState } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { DepartmentFilesBoard } from '../../components/monthly-report/department-files-board'
import { MonthlyReportToolbar } from '../../components/monthly-report/monthly-report-toolbar'
import { DocumentPreviewModal } from '../../components/monthly-report/ui/document-preview-modal'
import { ReportFetchError } from '../../components/monthly-report/ui/report-fetch-error'
import { PERIOD_FILTER_ALL } from '../../constants/monthly-report'
import { useMonthlyReportScope } from '../../hooks/use-monthly-report-scope'
import { useAuthStore } from '../../store/auth-store'
import type { MonthlyReport, ReportDepartment } from '../../types/monthly-report'

/**
 * The coordinator's Monthly Report: the filed record, one folder per department.
 * Nothing here can be moved or renamed — that is the director's library — so the
 * page is the approved reports and their files, and only that.
 */
export function DepartmentFilesPage() {
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

  const user = useAuthStore((s) => s.user)

  const [preview, setPreview] = useState<{
    report: MonthlyReport
    documentId: string
  } | null>(null)

  const approved = useMemo(
    () =>
      scoped
        .filter((report) => report.status === 'approved')
        .sort((a, b) => b.period.localeCompare(a.period)),
    [scoped],
  )

  // The coordinator's college is whichever they last filed for — the portal account
  // itself does not carry a department.
  const ownDepartment = useMemo<ReportDepartment | null>(() => {
    const email = user?.email.trim().toLowerCase()
    if (!email) return null
    const latest = reports
      .filter((report) => report.submittedBy.email.trim().toLowerCase() === email)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
    return latest?.department ?? null
  }, [reports, user?.email])

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <MonthlyReportToolbar
        title="Department Files"
        description="Approved monthly reports on record, filed under each department."
        noun="on record"
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

      <DepartmentFilesBoard
        reports={approved}
        period={period === PERIOD_FILTER_ALL ? null : period}
        ownDepartment={ownDepartment}
        initialized={initialized}
        onOpenDocument={(report, documentId) => setPreview({ report, documentId })}
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
