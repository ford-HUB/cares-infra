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
  /** Set once a grip has been dragged; otherwise the block is as tall as its text. */
  fixedHeight: boolean
}

/** With a fixed height, text is centred, clipped and scaled down to fit. */
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
