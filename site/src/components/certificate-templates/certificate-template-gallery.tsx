import { TEMPLATE_SKELETON_CARDS } from '../../constants/certificate-templates'
import type { CertificateTemplate } from '../../types/certificate-template'
import { CertificateTemplateCard } from './ui/certificate-template-card'
import { CertificateTemplatesGallerySkeleton } from './ui/certificate-templates-gallery-skeleton'

interface CertificateTemplateGalleryProps {
  templates: CertificateTemplate[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (template: CertificateTemplate) => void
  onAction: (action: string, template: CertificateTemplate) => void
}

/** The default view: templates are artwork, so they get a gallery, not a grid of text. */
export function CertificateTemplateGallery({
  templates,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: CertificateTemplateGalleryProps) {
  if (showSkeleton) {
    return <CertificateTemplatesGallerySkeleton cards={TEMPLATE_SKELETON_CARDS} />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {templates.map((template) => (
        <CertificateTemplateCard
          key={template.id}
          template={template}
          selected={template.id === selectedId}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
