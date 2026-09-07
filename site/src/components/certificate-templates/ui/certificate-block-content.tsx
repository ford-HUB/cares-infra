import { useRef } from 'react'
import { useFitToBox } from '../../../hooks/use-fit-to-box'
import type {
  CertificateDesign,
  CertificateElementId,
} from '../../../types/certificate-template'
import { CertificateElement } from './certificate-elements'

interface CertificateBlockContentProps {
  id: CertificateElementId
  design: CertificateDesign
  title: string
  /** True once the block has been given a height of its own by dragging a grip. */
  fixedHeight: boolean
}

/**
 * A block's contents inside the box it was sized to. With a height set, the copy is
 * centred in the box, clipped at its edges, and scaled down as far as it needs to go
 * to stay inside — so narrowing or shortening a block adjusts the text rather than
 * spilling it over the certificate.
 */
export function CertificateBlockContent({
  id,
  design,
  title,
  fixedHeight,
}: CertificateBlockContentProps) {
  const box = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)

  useFitToBox(box, content, fixedHeight)

  if (!fixedHeight) {
    return <CertificateElement id={id} design={design} title={title} />
  }

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
      <div ref={content} className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <CertificateElement id={id} design={design} title={title} />
      </div>
    </div>
  )
}
