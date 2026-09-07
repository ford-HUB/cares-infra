import { cn } from '@/lib/utils'
import {
  CERTIFICATE_ACCENT_STYLES,
  renderCertificateTokens,
} from '../../../constants/certificate-design'
import { elementFontStyle } from '../../../constants/certificate-fonts'
import { CERTIFICATE_FRAME_PRESETS } from '../../../constants/certificate-frames'
import {
  ALIGN_ITEMS,
  ALIGN_JUSTIFY,
  ALIGN_SELF_MARGIN,
  SIGNATORY_DEPARTMENT_SCALE,
  SIGNATORY_TITLE_SCALE,
  elementAlign,
  elementSizeStyle,
  elementWidth,
} from '../../../constants/certificate-typography'
import type {
  CertificateDesign,
  CertificateElementId,
} from '../../../types/certificate-template'
import { CertificateSealMark } from './certificate-seal-mark'

interface CertificateElementProps {
  id: CertificateElementId
  design: CertificateDesign
  title: string
}

/**
 * Sizes are container units (`cqw` — a percent of the sheet's width) rather than
 * pixels, so the whole certificate scales with the sheet: the same layout reads
 * identically in the editor, the detail panel and a full-page print.
 *
 * The contents of one movable block. The static preview and the drag-and-drop editor
 * both render through this, so a block cannot look one way while being positioned and
 * another once saved.
 */
export function CertificateElement({ id, design, title }: CertificateElementProps) {
  const accent = CERTIFICATE_ACCENT_STYLES[design.accent]
  const preset = CERTIFICATE_FRAME_PRESETS[design.frame]
  // A picked face and size win over the frame's own classes — inline style beats
  // the utility.
  const align = elementAlign(design, id)
  const font = {
    ...elementFontStyle(design, id),
    ...elementSizeStyle(design, id),
    textAlign: align,
  }

  if (id === 'headline') {
    return (
      <div className={cn('flex flex-col gap-[1.2cqw]', ALIGN_ITEMS[align])}>
        <p
          className={cn('uppercase', preset.headline, accent.headline)}
          style={font}
        >
          {design.headline}
        </p>
        <span className={cn('h-[0.5cqw] w-[14cqw] rounded-full', accent.rule)} />
      </div>
    )
  }

  if (id === 'title') {
    return (
      <p
        className={cn(
          'leading-tight font-semibold text-gray-800',
          preset.title,
        )}
        style={font}
      >
        {title}
      </p>
    )
  }

  if (id === 'body') {
    return (
      <p
        className={cn('leading-relaxed text-gray-600', preset.body)}
        style={font}
      >
        {renderCertificateTokens(design.body)}
      </p>
    )
  }

  if (id === 'seal') {
    return design.showSeal ? (
      // The seal is a mark, not a line of text, so alignment slides the whole disc.
      <span className={cn('block', ALIGN_SELF_MARGIN[align])}>
        <CertificateSealMark
          design={design}
          diameter={elementWidth(design, 'seal')}
          labelStyle={font}
        />
      </span>
    ) : null
  }

  return (
    <div
      className={cn('flex flex-wrap items-end gap-[4cqw]', ALIGN_JUSTIFY[align])}
      style={font}
    >
      {design.signatories.map((signatory) => (
        <div key={signatory.id} className="min-w-0 max-w-[30cqw] flex-1">
          <div className="mb-[0.8cqw] h-px w-full bg-gray-300" />
          <p
            className={cn(
              'truncate text-[1.8cqw] font-semibold text-gray-800',
              preset.signatureName,
            )}
            style={font}
          >
            {signatory.name}
          </p>
          <p
            className="truncate text-gray-600"
            style={elementSizeStyle(design, id, SIGNATORY_TITLE_SCALE)}
          >
            {signatory.title}
          </p>
          <p
            className="truncate text-gray-400"
            style={elementSizeStyle(design, id, SIGNATORY_DEPARTMENT_SCALE)}
          >
            {signatory.department}
          </p>
        </div>
      ))}
    </div>
  )
}
