import { useEffect, useState } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { MySubmissionsPanel } from '../../components/monthly-report/my-submissions-panel'
import { UploadReportForm } from '../../components/monthly-report/upload-report-form'
import { DocumentPreviewModal } from '../../components/monthly-report/ui/document-preview-modal'
import { ReportFetchError } from '../../components/monthly-report/ui/report-fetch-error'
import { useUploadReportForm } from '../../hooks/use-upload-report-form'
import { useMonthlyReportStore } from '../../store/monthly-report-store'
import type { MonthlyReport } from '../../types/monthly-report'

/**
 * The coordinator's side of monthly reporting: upload this month's report on the
 * left, and follow every report already sent — reviewing, approved, or returned with
 * a note — on the right. What the director decides shows here without a refresh.
 */
export function UploadReportPage() {
  const upload = useUploadReportForm()

  const initialized = useMonthlyReportStore((s) => s.initialized)
  const error = useMonthlyReportStore((s) => s.error)
  const fetchReports = useMonthlyReportStore((s) => s.fetchReports)

  const [preview, setPreview] = useState<{
    report: MonthlyReport
    documentId: string
  } | null>(null)

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Upload Report</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Send this month's report to the director and track what became of the ones
          you already sent.
        </p>
      </div>

      {error && <ReportFetchError message={error} onRetry={() => void fetchReports()} />}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <UploadReportForm {...upload} />

        <MySubmissionsPanel
          reports={upload.mine}
          initialized={initialized}
          errored={Boolean(error)}
          onOpenDocument={(report, documentId) => setPreview({ report, documentId })}
        />
      </div>

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
