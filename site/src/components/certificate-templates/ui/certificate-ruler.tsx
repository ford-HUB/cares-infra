import { cn } from '@/lib/utils'
import {
  RULER_LABEL_STEP,
  RULER_TICK_STEP,
} from '../../../constants/certificate-layout'

interface CertificateRulerProps {
  orientation: 'horizontal' | 'vertical'
  /** Live position of the block being dragged, as a percentage along this axis. */
  marker?: number
}

const ticks = Array.from(
  { length: 100 / RULER_TICK_STEP + 1 },
  (_, index) => index * RULER_TICK_STEP,
)

/**
 * The measuring edge around the sheet. Percentages, not millimetres — the sheet is
 * rendered at whatever size the dialog allows, so a share of the page is the only
 * measure that survives the scale, and it is what the layout itself stores.
 */
export function CertificateRuler({ orientation, marker }: CertificateRulerProps) {
  const horizontal = orientation === 'horizontal'

  return (
    <div
      aria-hidden
      className={cn(
        'relative bg-white',
        horizontal
          ? 'h-5 w-full border-y border-gray-200'
          : 'h-full w-5 border-x border-gray-200',
      )}
    >
      {ticks.map((tick) => {
        const major = tick % RULER_LABEL_STEP === 0
        const center = tick === 50

        return (
          <span
            key={tick}
            className={cn(
              'absolute',
              center
                ? 'bg-[var(--cares-primary)]'
                : major
                  ? 'bg-gray-400'
                  : 'bg-gray-200',
              horizontal
                ? cn('bottom-0 w-px', major ? 'h-2.5' : 'h-1.5')
                : cn('right-0 h-px', major ? 'w-2.5' : 'w-1.5'),
            )}
            style={horizontal ? { left: `${tick}%` } : { top: `${tick}%` }}
          />
        )
      })}

      {ticks
        .filter((tick) => tick % RULER_LABEL_STEP === 0 && tick > 0 && tick < 100)
        .map((tick) => (
          <span
            key={`label-${tick}`}
            className={cn(
              'absolute text-[8px] leading-none text-gray-400 tabular-nums',
              horizontal ? 'top-0.5 -translate-x-1/2' : 'left-0.5 -translate-y-1/2',
            )}
            style={horizontal ? { left: `${tick}%` } : { top: `${tick}%` }}
          >
            {tick}
          </span>
        ))}

      {marker !== undefined && (
        <span
          className={cn(
            'absolute bg-[var(--cares-primary)]',
            horizontal ? 'inset-y-0 w-0.5' : 'inset-x-0 h-0.5',
          )}
          style={horizontal ? { left: `${marker}%` } : { top: `${marker}%` }}
        />
      )}
    </div>
  )
}
