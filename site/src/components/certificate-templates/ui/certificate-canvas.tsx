import { Stamp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CERTIFICATE_ACCENT_STYLES } from '../../../constants/certificate-design'
import { elementFontStyle } from '../../../constants/certificate-fonts'
import { CERTIFICATE_FRAME_PRESETS } from '../../../constants/certificate-frames'
import {
  CERTIFICATE_ELEMENT_ORDER,
  isElementVisible,
} from '../../../constants/certificate-layout'
import {
  elementHeight,
  elementWidth,
} from '../../../constants/certificate-typography'
import type {
  CertificateDesign,
  CertificateOrientation,
} from '../../../types/certificate-template'
import { CertificateBlockContent } from './certificate-block-content'
import { CertificateImageLayer } from './certificate-image-layer'
import { CertificateFrameOrnament } from './certificate-frame-ornament'

interface CertificateCanvasProps {
  design: CertificateDesign
  orientation: CertificateOrientation
  /** Award line — the template's own name stands in for the recipient's award. */
  title: string
  /**
   * `thumb` sits in a table row, `tile` in the frame control, `card` in the gallery,
   * `full` in the detail preview.
   */
  variant?: 'thumb' | 'tile' | 'card' | 'full'
}

/**
 * The static certificate. `full` honours the saved layout element for element, so the
 * detail panel and the frame picker show exactly what the editor produced; the smaller
 * variants stay schematic because a 96px sheet cannot carry real positioning.
 */
export function CertificateCanvas({
  design,
  orientation,
  title,
  variant = 'card',
}: CertificateCanvasProps) {
  const accent = CERTIFICATE_ACCENT_STYLES[design.accent]
  const preset = CERTIFICATE_FRAME_PRESETS[design.frame]
  const portrait = orientation === 'portrait'
  const uploaded = Boolean(design.frameSvgUrl)

  if (variant === 'thumb') {
    return (
      <span
        aria-hidden
        className={cn(
          'relative flex h-9 w-11 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-white bg-contain bg-center bg-no-repeat',
          accent.frame,
          portrait && 'w-8',
        )}
        style={uploaded ? { backgroundImage: `url(${design.frameSvgUrl})` } : undefined}
      >
        {!uploaded && (
          <CertificateFrameOrnament
            frame={design.frame}
            accent={design.accent}
            compact
          />
        )}
        <span className={cn('relative h-0.5 w-5 rounded-full', accent.rule)} />
        <span className="relative h-0.5 w-6 rounded-full bg-gray-200" />
        <span className="relative h-0.5 w-4 rounded-full bg-gray-200" />
      </span>
    )
  }

  if (variant === 'full') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 p-4">
        <div
          className={cn(
            'relative @container max-h-full w-full overflow-hidden rounded-xl bg-white bg-contain bg-center bg-no-repeat text-center shadow-sm',
            !uploaded && preset.sheet,
            !uploaded && accent.frame,
            portrait ? 'aspect-[3/4] max-w-2xl' : 'aspect-[4/3] max-w-4xl',
          )}
          style={
            uploaded ? { backgroundImage: `url(${design.frameSvgUrl})` } : undefined
          }
        >
          {!uploaded && (
            <CertificateFrameOrnament frame={design.frame} accent={design.accent} />
          )}

          <CertificateImageLayer images={design.images} />

          {CERTIFICATE_ELEMENT_ORDER.filter((id) => isElementVisible(id, design)).map(
            (id) => {
              const position = design.layout[id]
              const height = elementHeight(design, id)

              return (
                <div
                  key={id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    // The seal is drawn at its own diameter, so it stays auto-width.
                    width: id === 'seal' ? 'auto' : `${elementWidth(design, id)}%`,
                    height: height === undefined ? 'auto' : `${height}%`,
                    zIndex: 0,
                  }}
                >
                  <CertificateBlockContent
                    id={id}
                    design={design}
                    title={title}
                    fixedHeight={height !== undefined}
                  />
                </div>
              )
            },
          )}
        </div>
      </div>
    )
  }

  // The sheet keeps its true proportion at every size; the height is what changes, so
  // a row of gallery cards still lines up.
  const tile = variant === 'tile'

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gray-50',
        tile ? 'px-2 py-2' : 'px-4 py-4',
      )}
    >
      <div
        className={cn(
          'relative flex w-auto flex-col items-center justify-center overflow-hidden rounded-lg bg-white bg-contain bg-center bg-no-repeat text-center shadow-sm',
          !uploaded && preset.sheet,
          !uploaded && accent.frame,
          // The royal panel eats the left edge, so the card copy clears it too.
          !uploaded && design.frame === 'royal' && 'pl-6',
          tile ? 'h-16 gap-1 px-2 py-1.5' : 'h-28 gap-2 px-4 py-3',
          portrait ? 'aspect-[3/4]' : 'aspect-[4/3]',
        )}
        style={uploaded ? { backgroundImage: `url(${design.frameSvgUrl})` } : undefined}
      >
        {!uploaded && (
          <CertificateFrameOrnament
            frame={design.frame}
            accent={design.accent}
            compact
          />
        )}

        <p
          className={cn(
            'relative text-[7px] uppercase',
            preset.headline,
            accent.headline,
          )}
          style={elementFontStyle(design, 'headline')}
        >
          {design.headline}
        </p>

        <span
          className={cn(
            'relative rounded-full',
            accent.rule,
            tile ? 'h-0.5 w-6' : 'h-1 w-12',
          )}
        />

        <p
          className={cn(
            'relative line-clamp-2 px-1 leading-tight font-semibold text-gray-700',
            tile ? 'text-[7px]' : 'text-[10px]',
            preset.title,
          )}
          style={elementFontStyle(design, 'title')}
        >
          {title}
        </p>

        <span className="relative flex w-full flex-col items-center gap-1">
          <span className="h-0.5 w-4/5 rounded-full bg-gray-200" />
          <span className="h-0.5 w-3/5 rounded-full bg-gray-200" />
        </span>

        {design.showSeal && (
          <span
            className={cn(
              'relative flex items-center justify-center rounded-full',
              accent.seal,
              tile ? 'h-3 w-3' : 'h-5 w-5',
            )}
          >
            <Stamp className={tile ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'} />
          </span>
        )}
      </div>
    </div>
  )
}
