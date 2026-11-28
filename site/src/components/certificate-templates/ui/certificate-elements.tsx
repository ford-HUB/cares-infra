import { cn } from '@/lib/utils'
import {
  CERTIFICATE_ACCENT_STYLES,
  certificateTitle,
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
  elementEmphasisStyle,
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
  /** Used as the award name when the design has no wording. */
  title: string
}

/** Sized in `cqw` so the layout scales with the sheet; shared by preview and editor. */
export function CertificateElement({ id, design, title }: CertificateElementProps) {
  const accent = CERTIFICATE_ACCENT_STYLES[design.accent]
  const preset = CERTIFICATE_FRAME_PRESETS[design.frame]
  // Inline face/size/weight override the frame's utility classes.
  const align = elementAlign(design, id)
  const font = {
    ...elementFontStyle(design, id),
    ...elementSizeStyle(design, id),
    ...elementEmphasisStyle(design, id),
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
        {renderCertificateTokens(certificateTitle(design, title))}
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
      // The seal is a mark, so alignment slides the whole disc.
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
