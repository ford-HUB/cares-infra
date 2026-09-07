import {
  TEMPLATE_CATEGORY_ACCENTS,
  TEMPLATE_CATEGORY_LABELS,
} from '../../../constants/certificate-templates'
import type { CertificateTemplateCategory } from '../../../types/certificate-template'

/** Category is identity, not state — it only ever carries its own accent tint. */
export function CertificateCategoryBadge({
  category,
}: {
  category: CertificateTemplateCategory
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TEMPLATE_CATEGORY_ACCENTS[category].chip}`}
    >
      {TEMPLATE_CATEGORY_LABELS[category]}
    </span>
  )
}
