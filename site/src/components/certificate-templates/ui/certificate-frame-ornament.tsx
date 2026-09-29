import { cn } from '@/lib/utils'
import { CERTIFICATE_ACCENT_STYLES } from '../../../constants/certificate-design'
import type {
  CertificateAccent,
  CertificateFrame,
} from '../../../types/certificate-template'

interface CertificateFrameOrnamentProps {
  frame: CertificateFrame
  accent: CertificateAccent
  /** Ornaments shrink with the sheet so a gallery card reads like the full preview. */
  compact?: boolean
}

/**
 * The decoration that makes each frame recognisable — side panel, corner ribbons,
 * banner corners, header band. Drawn with plain elements rather than artwork so a
 * frame follows the chosen accent instead of shipping six colour variants of an image.
 */
export function CertificateFrameOrnament({
  frame,
  accent,
  compact = false,
}: CertificateFrameOrnamentProps) {
  const tone = CERTIFICATE_ACCENT_STYLES[accent]
  const gilt = 'bg-amber-400'

  if (frame === 'classic') {
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute rounded-lg border',
          tone.frame,
          compact ? 'inset-1' : 'inset-3',
        )}
      />
    )
  }

  if (frame === 'royal') {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Curved side panel — the signature shape of the ornate certificates. */}
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-r-[60%_50%]',
            tone.solid,
            compact ? 'w-8' : 'w-28',
          )}
        />
        <span
          className={cn(
            'absolute inset-y-0 rounded-r-[60%_50%] opacity-70',
            gilt,
            compact ? 'left-8 w-1' : 'left-28 w-2',
          )}
        />
        <span
          className={cn(
            'absolute rounded-lg border border-amber-300',
            compact ? 'inset-1' : 'inset-3',
          )}
        />
      </span>
    )
  }

  if (frame === 'diagonal') {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span
          className={cn(
            'absolute rotate-45',
            tone.solid,
            compact ? '-top-3 -left-8 h-3 w-24' : '-top-10 -left-28 h-10 w-80',
          )}
        />
        <span
          className={cn(
            'absolute rotate-45 opacity-80',
            gilt,
            compact ? '-top-1 -left-8 h-1 w-24' : '-top-3 -left-28 h-2.5 w-80',
          )}
        />
        <span
          className={cn(
            'absolute rotate-45',
            tone.solid,
            compact ? '-right-8 -bottom-3 h-3 w-24' : '-right-28 -bottom-10 h-10 w-80',
          )}
        />
        <span
          className={cn(
            'absolute rotate-45 opacity-80',
            gilt,
            compact ? '-right-8 -bottom-1 h-1 w-24' : '-right-28 -bottom-3 h-2.5 w-80',
          )}
        />
      </span>
    )
  }

  if (frame === 'corners') {
    const triangle = compact ? 'h-6 w-6' : 'h-24 w-24'

    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span
          className={cn(
            'absolute top-0 left-0 [clip-path:polygon(0_0,100%_0,0_100%)]',
            tone.solid,
            triangle,
          )}
        />
        <span
          className={cn(
            'absolute top-0 right-0 [clip-path:polygon(100%_0,100%_100%,0_0)]',
            tone.solid,
            triangle,
          )}
        />
        <span
          className={cn(
            'absolute inset-x-0 bottom-0',
            tone.solid,
            compact ? 'h-1.5' : 'h-5',
          )}
        />
      </span>
    )
  }

  if (frame === 'modern') {
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0',
          tone.solid,
          compact ? 'h-1.5' : 'h-4',
        )}
      />
    )
  }

  return null
}
