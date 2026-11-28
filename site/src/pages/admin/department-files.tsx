import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Building2 } from 'lucide-react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { DepartmentReportList } from '../../components/monthly-report/department-report-list'
import { MonthlyReportToolbar } from '../../components/monthly-report/monthly-report-toolbar'
import { DocumentPreviewModal } from '../../components/monthly-report/ui/document-preview-modal'
import { ReportFetchError } from '../../components/monthly-report/ui/report-fetch-error'
import { ReportUploadCalendar } from '../../components/monthly-report/ui/report-upload-calendar'
import {
  DEPARTMENT_LABELS,
  PERIOD_FILTER_ALL,
  reportDepartmentFor,
  type PeriodFilter,
} from '../../constants/monthly-report'
import { useMonthlyReportScope } from '../../hooks/use-monthly-report-scope'
import { useProfileStore } from '../../store/profile-store'
import type { MonthlyReport } from '../../types/monthly-report'

/** College comes from the profile, so other departments never appear. */
export function DepartmentFilesPage() {
  // Filters by upload month, not reporting month; only `scoped` (search) is used.
  const { scoped, search, setSearch, initialized, error, fetchReports } =
    useMonthlyReportScope()

  const profileDepartment = useProfileStore((s) => s.profile?.department)
  const profileInitialized = useProfileStore((s) => s.initialized)
  const ensureProfile = useProfileStore((s) => s.ensureProfile)

  useEffect(() => {
    void ensureProfile()
  }, [ensureProfile])

  const department = reportDepartmentFor(profileDepartment)
  const ready = initialized && profileInitialized

  const [month, setMonth] = useState<PeriodFilter>(PERIOD_FILTER_ALL)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const changeMonth = (next: PeriodFilter) => {
    setMonth(next)
    setSelectedDay(null)
  }
  const [preview, setPreview] = useState<{
    report: MonthlyReport
    documentId: string
  } | null>(null)

  // Strictly the assigned college; empty until the profile loads.
  const departmentReports = useMemo(
    () =>
      department
        ? scoped
            .filter((report) => report.department === department)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        : [],
    [scoped, department],
  )

  const uploadMonths = useMemo(
    () =>
      [...new Set(departmentReports.map((report) => dayjs(report.submittedAt).format('YYYY-MM')))]
        .sort()
        .reverse(),
    [departmentReports],
  )

  const inMonth = useMemo(
    () =>
      month === PERIOD_FILTER_ALL
        ? departmentReports
        : departmentReports.filter((report) =>
            dayjs(report.submittedAt).isSame(`${month}-01`, 'month'),
          ),
    [departmentReports, month],
  )

  const listed = useMemo(
    () =>
      selectedDay
        ? inMonth.filter((report) => dayjs(report.submittedAt).isSame(selectedDay, 'day'))
        : inMonth,
    [inMonth, selectedDay],
  )

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <MonthlyReportToolbar
        title="Monthly Report"
        description={
          department
            ? `${DEPARTMENT_LABELS[department]} — every monthly report uploaded for your department.`
            : 'Monthly reports uploaded for your department.'
        }
        noun="reports"
        search={search}
        period={month}
        periods={uploadMonths}
        shown={listed.length}
        total={departmentReports.length}
        initialized={ready}
        periodLabel="upload month"
        onSearchChange={setSearch}
        onPeriodChange={changeMonth}
      />

      {error && <ReportFetchError message={error} onRetry={() => void fetchReports()} />}

      {ready && !department && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <Building2 className="h-4 w-4 shrink-0 text-amber-500" />
          {profileDepartment
            ? `Your profile's department (${profileDepartment}) is not one the report board files under, so no reports can be listed.`
            : 'No department is assigned to your profile yet, so no reports can be listed.'}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <DepartmentReportList
          reports={listed}
          initialized={ready}
          errored={Boolean(error)}
          selectedDay={selectedDay}
          onClearDay={() => setSelectedDay(null)}
          onOpenDocument={(report, documentId) => setPreview({ report, documentId })}
        />

        <aside className="lg:sticky lg:top-0 lg:self-start">
          <ReportUploadCalendar
            reports={departmentReports}
            month={month === PERIOD_FILTER_ALL ? null : month}
            onMonthChange={changeMonth}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </aside>
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
