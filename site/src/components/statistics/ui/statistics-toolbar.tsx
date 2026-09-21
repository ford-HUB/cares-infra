import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  STATISTICS_CATEGORY_ALL,
  STATISTICS_DEPARTMENT_ALL,
  STATISTICS_RANGE_OPTIONS,
} from '../../../constants/department-statistics'
import { formatRelativeTime } from '../../../constants/formatting'
import type { StatisticsRange } from '../../../types/department-statistics'

interface StatisticsToolbarProps {
  title: string
  /** The scope in words — a college name, or "All departments". */
  scopeLabel: string
  generatedAt: string | null
  range: StatisticsRange
  category: string
  categories: readonly string[]
  /**
   * Present only on the director-level view, where the reader picks the college.
   * A coordinator's scope is fixed by their profile, so they get no such filter.
   */
  departmentFilter?: {
    value: string
    options: readonly string[]
    onChange: (department: string) => void
  }
  refreshing: boolean
  onRangeChange: (range: StatisticsRange) => void
  onCategoryChange: (category: string) => void
  onRefresh: () => void
  /** Downloads the month-by-month table as CSV. */
  onExportCsv: () => void
  /** Generates the full printable report as a PDF. */
  onExportPdf: () => void
}

/**
 * Title plus the two filters every chart below obeys: how far back, and which event
 * category. One row, above the charts — a filter that lives beside one chart reads as
 * if it only applied to that chart.
 */
export function StatisticsToolbar({
  title,
  scopeLabel,
  generatedAt,
  range,
  category,
  categories,
  departmentFilter,
  refreshing,
  onRangeChange,
  onCategoryChange,
  onRefresh,
  onExportCsv,
  onExportPdf,
}: StatisticsToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600">
          {scopeLabel} — activity, attendance and reporting over the selected period.
        </p>
        {generatedAt && (
          <p className="mt-0.5 text-[11px] text-gray-400">
            Updated {formatRelativeTime(generatedAt)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(value) => value && onRangeChange(value as StatisticsRange)}
          variant="outline"
          size="sm"
          aria-label="Period"
        >
          {STATISTICS_RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="px-3">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {departmentFilter && (
          <Select
            value={departmentFilter.value}
            onValueChange={departmentFilter.onChange}
          >
            <SelectTrigger size="sm" className="w-56" aria-label="Department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATISTICS_DEPARTMENT_ALL}>All departments</SelectItem>
              {departmentFilter.options.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger size="sm" className="w-44" aria-label="Event category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATISTICS_CATEGORY_ALL}>All categories</SelectItem>
            {categories.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
          <Download />
          Export CSV
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onExportPdf}>
          <FileText />
          Export PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
