import { TEMPLATE_ORIENTATION_LABELS, TEMPLATE_SKELETON_ROWS } from '../../constants/certificate-templates'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { CertificateTemplate } from '../../types/certificate-template'
import { CertificateCategoryBadge } from './ui/certificate-category-badge'
import { CertificateCanvas } from './ui/certificate-canvas'
import { CertificateStatusBadge } from './ui/certificate-status-badge'
import { CertificateTemplateActions } from './ui/certificate-template-actions'
import { CertificateTemplatesTableSkeleton } from './ui/certificate-templates-table-skeleton'

interface CertificateTemplateTableProps {
  templates: CertificateTemplate[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (template: CertificateTemplate) => void
  onAction: (action: string, template: CertificateTemplate) => void
}

const headCell =
  'px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'

/** The dense view, for comparing issuance across the whole library at once. */
export function CertificateTemplateTable({
  templates,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: CertificateTemplateTableProps) {
  return (
    <div
      aria-busy={showSkeleton}
      className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className={headCell}>Template</th>
            <th className={headCell}>Category</th>
            <th className={headCell}>Status</th>
            <th className={`${headCell} text-right`}>Issued</th>
            <th className={`${headCell} text-right`}>Events</th>
            <th className={headCell}>Last updated</th>
            <th className={`${headCell} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        {showSkeleton ? (
          <CertificateTemplatesTableSkeleton rows={TEMPLATE_SKELETON_ROWS} />
        ) : (
          <tbody className="divide-y divide-gray-100">
            {templates.map((template) => {
              const isSelected = template.id === selectedId

              return (
                <tr
                  key={template.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-green-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelect(template)}
                      className="flex w-full min-w-0 items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                    >
                      <CertificateCanvas
                        variant="thumb"
                        design={template.design}
                        orientation={template.orientation}
                        title={template.name}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {template.name}
                        </span>
                        <span className="block font-mono text-[11px] text-gray-400">
                          {template.reference} ·{' '}
                          {TEMPLATE_ORIENTATION_LABELS[template.orientation]}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <CertificateCategoryBadge category={template.category} />
                  </td>
                  <td className="px-3 py-2.5">
                    <CertificateStatusBadge status={template.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(template.issued)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {template.deployedEvents}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block text-[12px] text-gray-700">
                      {formatDateShort(template.updatedAt)}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      by {template.updatedBy}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <CertificateTemplateActions
                        template={template}
                        onAction={onAction}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        )}
      </table>
    </div>
  )
}
