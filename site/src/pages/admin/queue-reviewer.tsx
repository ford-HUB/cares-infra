import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { MonthlyReportPipeline } from '../../components/monthly-report/monthly-report-pipeline'
import { MonthlyReportToolbar } from '../../components/monthly-report/monthly-report-toolbar'
import { ReportReviewPanel } from '../../components/monthly-report/report-review-panel'
import { ReportSubmissionList } from '../../components/monthly-report/report-submission-list'
import { DocumentPreviewModal } from '../../components/monthly-report/ui/document-preview-modal'
import { MonthlyReportPipelineSkeleton } from '../../components/monthly-report/ui/monthly-report-pipeline-skeleton'
import { ReportFetchError } from '../../components/monthly-report/ui/report-fetch-error'
import { ReviewDecisionModal } from '../../components/monthly-report/ui/review-decision-modal'
import {
  PERIOD_FILTER_ALL,
  REPORT_STATUS_FILTER_ALL,
  REPORT_STATUS_RANK,
  type ReportStatusFilter,
} from '../../constants/monthly-report'
import { useMonthlyReportScope } from '../../hooks/use-monthly-report-scope'
import { useMonthlyReportStore } from '../../store/monthly-report-store'
import type { MonthlyReportCounts } from '../../types/monthly-report'

/**
 * The director's inbox for coordinator submissions: what still owes a decision, the
 * document behind each one, and the approve/return call. Approved reports leave this
 * screen for the Monthly Report library, filed under their college.
 */
export function QueueReviewerPage() {
  const {
    reports,
    scoped,
    periods,
    period,
    setPeriod,
    search,
    setSearch,
    loading,
    initialized,
    error,
    fetchReports,
  } = useMonthlyReportScope()

  const decide = useMonthlyReportStore((s) => s.decide)

  const [status, setStatus] = useState<ReportStatusFilter>(REPORT_STATUS_FILTER_ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'approved' | 'returned' | null>(null)
  const [saving, setSaving] = useState(false)

  // An approved report has left the queue for the Monthly Report library, so it is
  // not listed here — only what still owes the director a decision.
  const inQueue = useMemo(
    () => scoped.filter((report) => report.status !== 'approved'),
    [scoped],
  )

  const counts = useMemo<MonthlyReportCounts>(
    () => ({
      total: inQueue.length,
      underReview: inQueue.filter((report) => report.status === 'under_review').length,
      returned: inQueue.filter((report) => report.status === 'returned').length,
      approved: scoped.filter((report) => report.status === 'approved').length,
    }),
    [inQueue, scoped],
  )

  const queue = useMemo(
    () =>
      inQueue
        .filter(
          (report) => status === REPORT_STATUS_FILTER_ALL || report.status === status,
        )
        .sort((a, b) => {
          // What still owes a decision first, then whatever moved most recently.
          const byStatus = REPORT_STATUS_RANK[a.status] - REPORT_STATUS_RANK[b.status]
          if (byStatus !== 0) return byStatus
          return b.submittedAt.localeCompare(a.submittedAt)
        }),
    [inQueue, status],
  )

  // Read from the store rather than holding a copy, so the panel reflects a decision
  // the moment it lands. Falling back to the first row keeps the right column filled
  // — including after a filter hides the previous selection.
  const selected = queue.find((report) => report.id === selectedId) ?? queue[0] ?? null

  const runMutation = async (action: () => Promise<void>, message: string) => {
    setSaving(true)
    try {
      await action()
      toast.success(message)
    } catch {
      toast.error('The report could not be updated')
    } finally {
      setSaving(false)
    }
  }

  const handleDecision = (note: string) => {
    if (!selected || !decision) return
    void runMutation(
      () => decide(selected.id, { decision, note }),
      decision === 'approved'
        ? `${selected.reference} approved and filed under ${selected.department}`
        : `${selected.reference} returned to ${selected.submittedBy.name}`,
    ).then(() => setDecision(null))
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <MonthlyReportToolbar
        title="Queue Reviewer"
        description="Monthly reports submitted by coordinators, waiting on your decision."
        noun="submissions"
        search={search}
        period={period}
        periods={periods}
        shown={queue.length}
        total={reports.filter((report) => report.status !== 'approved').length}
        initialized={initialized}
        onSearchChange={setSearch}
        onPeriodChange={setPeriod}
      />

      {error && <ReportFetchError message={error} onRetry={() => void fetchReports()} />}

      {initialized ? (
        <MonthlyReportPipeline
          counts={counts}
          period={period === PERIOD_FILTER_ALL ? null : period}
          status={status}
          onStatusChange={setStatus}
        />
      ) : (
        <MonthlyReportPipelineSkeleton />
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 shrink-0 flex-col lg:w-80 xl:w-96">
          <ReportSubmissionList
            reports={queue}
            loading={loading}
            initialized={initialized}
            errored={Boolean(error)}
            selectedId={selected?.id}
            onSelect={(report) => setSelectedId(report.id)}
          />
        </div>

        <ReportReviewPanel
          report={selected}
          initialized={initialized}
          saving={saving}
          onOpenDocument={(document) => setPreviewDocumentId(document.id)}
          onApprove={() => setDecision('approved')}
          onReturn={() => setDecision('returned')}
        />
      </div>

      {previewDocumentId && selected && (
        <DocumentPreviewModal
          key={previewDocumentId}
          report={selected}
          initialDocumentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}

      {decision && selected && (
        <ReviewDecisionModal
          // Keyed by report so the note never carries over to another submission.
          key={`${selected.id}-${decision}`}
          report={selected}
          decision={decision}
          saving={saving}
          onClose={() => setDecision(null)}
          onSubmit={handleDecision}
        />
      )}
    </ContentShell>
  )
}
