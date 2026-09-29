import { Stamp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CERTIFICATE_ACCENT_STYLES } from '../../../constants/certificate-design'
import { sealAccentOf, sealStyleOf } from '../../../constants/certificate-seals'
import type { CertificateDesign } from '../../../types/certificate-template'

interface CertificateSealMarkProps {
  design: CertificateDesign
  /** Diameter, in the sheet's own units, so the seal scales with the certificate. */
  diameter: number
  /** Font of the seal block, applied to the label. */
  labelStyle?: React.CSSProperties
}

/** Points of a star with `points` spikes, drawn in a 100×100 box. */
function starPoints(points: number, outer: number, inner: number): string {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner
    const angle = (Math.PI * index) / points - Math.PI / 2
    return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`
  }).join(' ')
}

/** Evenly spaced circles around the rim, which is what makes a rosette scalloped. */
function scallops(count: number, radius: number, size: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    return {
      key: index,
      cx: 50 + radius * Math.cos(angle),
      cy: 50 + radius * Math.sin(angle),
      r: size,
    }
  })
}

/**
 * The seal itself: an imported SVG when the director uploaded one, otherwise the
 * pre-built artwork they picked. Everything is drawn in the accent colour and sized
 * off the seal block, so a seal cannot fall out of step with the rest of the sheet.
 */
export function CertificateSealMark({
  design,
  diameter,
  labelStyle,
}: CertificateSealMarkProps) {
  const accent = CERTIFICATE_ACCENT_STYLES[sealAccentOf(design)]
  const style = sealStyleOf(design)
  const box = { width: `${diameter}cqw`, height: `${diameter}cqw` }

  if (design.sealSvgUrl) {
    return (
      <span className="relative flex flex-col items-center" style={box}>
        <img
          src={design.sealSvgUrl}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
        {design.sealLabel && (
          <span
            className="absolute inset-x-0 bottom-[12%] px-[0.6cqw] text-center leading-none tracking-wider uppercase"
            style={labelStyle}
          >
            {design.sealLabel}
          </span>
        )}
      </span>
    )
  }

  if (style === 'stamp') {
    return (
      <span
        className={cn(
          'flex flex-col items-center justify-center gap-[0.4cqw] rounded-full',
          accent.seal,
        )}
        style={box}
      >
        <Stamp
          style={{ width: `${diameter * 0.3}cqw`, height: `${diameter * 0.3}cqw` }}
        />
        {design.sealLabel && (
          <span
            className="px-[0.6cqw] leading-none tracking-wider uppercase"
            style={labelStyle}
          >
            {design.sealLabel}
          </span>
        )}
      </span>
    )
  }

  return (
    <span
      className={cn('relative flex items-center justify-center', accent.seal, 'bg-transparent')}
      style={box}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden
      >
        {style === 'starburst' && (
          <>
            <polygon points={starPoints(24, 48, 40)} fill="currentColor" opacity={0.18} />
            <polygon
              points={starPoints(24, 48, 40)}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <circle cx={50} cy={50} r={33} stroke="currentColor" strokeWidth={2} />
          </>
        )}

        {style === 'rosette' && (
          <>
            <path
              d="M38 74 L30 98 L44 91 L50 100 L56 91 L70 98 L62 74 Z"
              fill="currentColor"
              opacity={0.35}
            />
            {scallops(14, 38, 9).map((one) => (
              <circle
                key={one.key}
                cx={one.cx}
                cy={one.cy}
                r={one.r}
                fill="currentColor"
                opacity={0.22}
              />
            ))}
            <circle cx={50} cy={50} r={34} fill="currentColor" opacity={0.14} />
            <circle cx={50} cy={50} r={34} stroke="currentColor" strokeWidth={2} />
          </>
        )}

        {style === 'laurel' && (
          <>
            <path
              d="M50 92 C24 84 14 62 20 36"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d="M50 92 C76 84 86 62 80 36"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {[0, 1, 2, 3, 4].map((index) => (
              <g key={index} opacity={0.55}>
                <ellipse
                  cx={22 + index * 5}
                  cy={78 - index * 12}
                  rx={7}
                  ry={4}
                  fill="currentColor"
                  transform={`rotate(${-50 + index * 12} ${22 + index * 5} ${78 - index * 12})`}
                />
                <ellipse
                  cx={78 - index * 5}
                  cy={78 - index * 12}
                  rx={7}
                  ry={4}
                  fill="currentColor"
                  transform={`rotate(${50 - index * 12} ${78 - index * 5} ${78 - index * 12})`}
                />
              </g>
            ))}
          </>
        )}

        {style === 'ribbon' && (
          <>
            <circle cx={50} cy={44} r={34} fill="currentColor" opacity={0.14} />
            <circle cx={50} cy={44} r={34} stroke="currentColor" strokeWidth={2} />
            <path
              d="M8 62 H92 L84 78 H16 Z"
              fill="currentColor"
              opacity={0.85}
            />
            <path d="M8 62 L2 70 L8 78 Z" fill="currentColor" opacity={0.5} />
            <path d="M92 62 L98 70 L92 78 Z" fill="currentColor" opacity={0.5} />
          </>
        )}

        {style === 'monogram' && (
          <>
            <circle cx={50} cy={50} r={46} stroke="currentColor" strokeWidth={1.5} />
            <circle
              cx={50}
              cy={50}
              r={38}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          </>
        )}
      </svg>

      {design.sealLabel && (
        <span
          className={cn(
            'relative px-[0.6cqw] text-center leading-none tracking-wider uppercase',
            style === 'ribbon' && 'translate-y-[8%]',
          )}
          style={labelStyle}
        >
          {design.sealLabel}
        </span>
      )}
    </span>
  )
}
