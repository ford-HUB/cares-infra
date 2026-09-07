import { Rocket, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TEMPLATE_ORIENTATION_LABELS } from '../../../constants/certificate-templates'
import { formatNumber, formatRelativeTime } from '../../../constants/formatting'
import type { CertificateTemplate } from '../../../types/certificate-template'
import { CertificateCategoryBadge } from './certificate-category-badge'
import { CertificateCanvas } from './certificate-canvas'
import { CertificateStatusBadge } from './certificate-status-badge'
import { CertificateTemplateActions } from './certificate-template-actions'

interface CertificateTemplateCardProps {
  template: CertificateTemplate
  selected: boolean
  onSelect: (template: CertificateTemplate) => void
  onAction: (action: string, template: CertificateTemplate) => void
}

/**
 * A template is a visual thing, so the preview leads and the metadata supports it.
 * Deploy is the primary action and is disabled off `published` — the status pill and
 * the button then say the same thing, which is the point.
 */
export function CertificateTemplateCard({
  template,
  selected,
  onSelect,
  onAction,
}: CertificateTemplateCardProps) {
  const deployable = template.status === 'published'

  return (
    <Card
      size="sm"
      className={cn(
        'gap-0 py-0 shadow-sm transition-colors',
        selected && 'ring-2 ring-[var(--cares-primary)]',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(template)}
        className="block w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
      >
        <CertificateCanvas
          design={template.design}
          orientation={template.orientation}
          title={template.name}
        />
      </button>

      <CardContent className="space-y-2 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {template.name}
            </p>
            <p className="font-mono text-[11px] text-gray-400">{template.reference}</p>
          </div>
          <CertificateStatusBadge status={template.status} />
        </div>

        <p className="line-clamp-2 text-[12px] leading-snug text-gray-500">
          {template.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <CertificateCategoryBadge category={template.category} />
          <span className="text-[11px] text-gray-400">
            {TEMPLATE_ORIENTATION_LABELS[template.orientation]}
          </span>
        </div>

        <dl className="flex items-center gap-4 border-t border-gray-100 pt-2">
          <div className="min-w-0">
            <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
              Issued
            </dt>
            <dd className="text-[13px] font-semibold text-gray-900 tabular-nums">
              {formatNumber(template.issued)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
              Events
            </dt>
            <dd className="text-[13px] font-semibold text-gray-900 tabular-nums">
              {template.deployedEvents}
            </dd>
          </div>
          <div className="ml-auto min-w-0 text-right">
            <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
              Updated
            </dt>
            <dd className="truncate text-[11px] text-gray-400">
              {formatRelativeTime(template.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onAction('customize', template)}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Customize
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!deployable}
          title={deployable ? undefined : 'Only published templates can be deployed'}
          onClick={() => onAction('deploy', template)}
        >
          <Rocket className="h-3.5 w-3.5" />
          Deploy
        </Button>
        <CertificateTemplateActions template={template} onAction={onAction} />
      </CardFooter>
    </Card>
  )
}
