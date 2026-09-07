import { LayoutGrid, List, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  TEMPLATE_CATEGORY_FILTERS,
  TEMPLATE_STATUS_FILTERS,
  type TemplateCategoryFilter,
  type TemplateStatusFilter,
  type TemplateViewMode,
} from '../../constants/certificate-templates'

interface CertificateTemplatesToolbarProps {
  search: string
  status: TemplateStatusFilter
  category: TemplateCategoryFilter
  view: TemplateViewMode
  shown: number
  total: number
  /** False until the first fetch settles, so the count doesn't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: TemplateStatusFilter) => void
  onCategoryChange: (value: TemplateCategoryFilter) => void
  onViewChange: (value: TemplateViewMode) => void
  onCreate: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function CertificateTemplatesToolbar({
  search,
  status,
  category,
  view,
  shown,
  total,
  initialized,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onViewChange,
  onCreate,
}: CertificateTemplatesToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Certificate Templates</h1>
        {initialized ? (
          <p className="text-[13px] text-gray-500 tabular-nums">
            {shown} of {total} templates
          </p>
        ) : (
          <Skeleton aria-hidden className="h-3.5 w-28" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search template name or reference"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as TemplateStatusFilter)
          }
          className={selectClass}
        >
          {TEMPLATE_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as TemplateCategoryFilter)
          }
          className={selectClass}
        >
          {TEMPLATE_CATEGORY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* One choice of two, so a toggle group rather than two ad-hoc buttons. */}
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && onViewChange(value as TemplateViewMode)}
          variant="outline"
          size="sm"
          aria-label="Layout"
        >
          <ToggleGroupItem value="grid" aria-label="Gallery view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="List view">
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button size="sm" className="h-9" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          New template
        </Button>
      </div>
    </div>
  )
}
