import { Rocket, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TEMPLATE_ORIENTATION_LABELS } from '../../constants/certificate-templates'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { CertificateTemplate } from '../../types/certificate-template'
import { CertificateCategoryBadge } from './ui/certificate-category-badge'
import { CertificateCanvas } from './ui/certificate-canvas'
import { CertificateStatusBadge } from './ui/certificate-status-badge'
import { SignatoryAvatar } from './ui/signatory-avatar'

interface CertificateTemplateDetailProps {
  template: CertificateTemplate
  onClose: () => void
  onAction: (action: string, template: CertificateTemplate) => void
}

/**
 * Everything about one template that the gallery card has no room for. It opens beside
 * the library rather than over it, so the director keeps the list in view while
 * checking a template's signatories before deploying it.
 */
export function CertificateTemplateDetail({
  template,
  onClose,
  onAction,
}: CertificateTemplateDetailProps) {
  const deployable = template.status === 'published'

  return (
    <Card size="sm" className="shadow-sm xl:w-80 xl:shrink-0">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Template preview
            </p>
            <p className="truncate text-[15px] font-semibold text-gray-900">
              {template.name}
            </p>
            <p className="font-mono text-[11px] text-gray-400">{template.reference}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-100">
          <CertificateCanvas
            design={template.design}
            orientation={template.orientation}
            title={template.name}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <CertificateStatusBadge status={template.status} />
          <CertificateCategoryBadge category={template.category} />
          <span className="text-[11px] text-gray-400">
            {TEMPLATE_ORIENTATION_LABELS[template.orientation]}
          </span>
        </div>

        <p className="text-[12px] leading-snug text-gray-500">{template.description}</p>

        <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <div>
            <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
              Issued
            </dt>
            <dd className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
              {formatNumber(template.issued)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
              Deployed to
            </dt>
            <dd className="text-lg leading-tight font-semibold text-gray-900 tabular-nums">
              {template.deployedEvents}
              <span className="ml-1 text-[11px] font-normal text-gray-400">events</span>
            </dd>
          </div>
        </dl>

        <div className="space-y-1 border-t border-gray-100 pt-3">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase">
            Signatories
          </p>
          <ul className="space-y-0.5">
            {template.design.signatories.map((signatory) => (
              <li key={signatory.id} className="flex items-center gap-2">
                <SignatoryAvatar
                  name={signatory.name}
                  avatarUrl={signatory.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-gray-700">
                    {signatory.name}
                  </span>
                  <span className="block truncate text-[11px] text-gray-400">
                    {signatory.title} · {signatory.department}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="border-t border-gray-100 pt-3 text-[11px] text-gray-400">
          Updated {formatDateShort(template.updatedAt)} by {template.updatedBy}
        </p>

        <div className="flex items-center gap-2">
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
            className="flex-1"
            size="sm"
            disabled={!deployable}
            title={deployable ? undefined : 'Only published templates can be deployed'}
            onClick={() => onAction('deploy', template)}
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
