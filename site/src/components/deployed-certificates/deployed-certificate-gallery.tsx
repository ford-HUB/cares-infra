import { DEPLOYMENT_SKELETON_CARDS } from '../../constants/deployed-certificates'
import type { DeployedCertificate } from '../../types/deployed-certificate'
import { DeployedCertificateCard } from './ui/deployed-certificate-card'
import { DeployedCertificatesGallerySkeleton } from './ui/deployed-certificates-gallery-skeleton'

interface DeployedCertificateGalleryProps {
  deployments: DeployedCertificate[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (deployment: DeployedCertificate) => void
  onAction: (action: string, deployment: DeployedCertificate) => void
}

/** The default view: the deployed sheet is the thing being checked, so it is shown. */
export function DeployedCertificateGallery({
  deployments,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: DeployedCertificateGalleryProps) {
  if (showSkeleton) {
    return <DeployedCertificatesGallerySkeleton cards={DEPLOYMENT_SKELETON_CARDS} />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {deployments.map((deployment) => (
        <DeployedCertificateCard
          key={deployment.id}
          deployment={deployment}
          selected={deployment.id === selectedId}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
