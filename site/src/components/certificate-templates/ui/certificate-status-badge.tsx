import {
  TEMPLATE_STATUS_BADGE_STYLES,
  TEMPLATE_STATUS_DOT_STYLES,
  TEMPLATE_STATUS_LABELS,
} from '../../../constants/certificate-templates'
import type { CertificateTemplateStatus } from '../../../types/certificate-template'

/** Dense status pill, shared by the gallery card and the table row. */
export function CertificateStatusBadge({
  status,
}: {
  status: CertificateTemplateStatus
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${TEMPLATE_STATUS_BADGE_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TEMPLATE_STATUS_DOT_STYLES[status]}`} />
      {TEMPLATE_STATUS_LABELS[status]}
    </span>
  )
}
