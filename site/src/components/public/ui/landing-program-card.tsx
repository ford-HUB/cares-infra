import { ArrowRight } from 'lucide-react'
import { LANDING_SERIF } from '../../../constants/landing-bulletin'
import {
  LANDING_PROGRAM_FALLBACK_LOGO,
  LANDING_PROGRAM_TONES,
  LANDING_PROGRAMS_COPY,
  type LandingDepartmentProgram,
} from '../../../constants/landing-programs'

const VISIBLE_HIGHLIGHTS = 4

const activityCount = (count: number) =>
  count === 0
    ? 'Listed program components'
    : `${count} documented ${count === 1 ? 'activity' : 'activities'}`

interface LandingProgramCardProps {
  program: LandingDepartmentProgram
  onSelect: (program: LandingDepartmentProgram) => void
}

/** A department's photo, logo, program label and highlights. Opens its activities. */
export function LandingProgramCard({ program, onSelect }: LandingProgramCardProps) {
  const hiddenHighlights = program.highlights.length - VISIBLE_HIGHLIGHTS

  return (
    <button
      type="button"
      onClick={() => onSelect(program)}
      aria-label={`View documented activities for ${program.department}`}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--cares-border)] bg-[var(--cares-about-card)] text-left shadow-md transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-3 focus-visible:ring-emerald-400 focus-visible:outline-none"
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[var(--cares-about-sage)] sm:h-36">
        {program.photo ? (
          <img
            src={program.photo}
            alt={`Photograph from bulletin page ${program.photoPage}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`${LANDING_SERIF} flex h-full items-center justify-center bg-gradient-to-br from-[var(--cares-primary)] to-emerald-600 p-4 text-center text-lg font-bold text-emerald-50`}
          >
            {LANDING_PROGRAMS_COPY.noPhoto}
          </div>
        )}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 bottom-0 bg-gradient-to-b from-transparent to-black/25"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        {/* The glass label tucks under the logo's right edge, so the two read as one
            badge with no gap between them. */}
        <div className="relative z-10 -mt-7 flex min-h-14 items-center">
          <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-md">
            <img
              src={program.logo ?? LANDING_PROGRAM_FALLBACK_LOGO}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </span>
          <span
            className={`-ml-4 min-w-0 rounded-md border border-white/70 bg-white/55 py-1.5 pr-3 pl-6 text-[12.5px] leading-tight font-extrabold shadow-sm backdrop-blur-md backdrop-saturate-150 ${LANDING_PROGRAM_TONES[program.tone]}`}
          >
            {program.program}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2.5">
          <h3
            className={`${LANDING_SERIF} text-[17px] leading-tight font-bold text-[var(--cares-heading)]`}
          >
            {program.department}
          </h3>
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        {program.tagline && (
          <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-[var(--cares-muted)]">
            {program.tagline}
          </p>
        )}

        <div className="mt-3 flex flex-wrap content-start gap-1.5">
          {program.highlights.slice(0, VISIBLE_HIGHLIGHTS).map((highlight) => (
            <span
              key={highlight}
              className="max-w-full rounded bg-emerald-50 px-1.5 py-1 text-[11px] leading-tight text-emerald-900/80"
            >
              {highlight}
            </span>
          ))}
          {hiddenHighlights > 0 && (
            <span className="rounded bg-emerald-50 px-1.5 py-1 text-[11px] leading-tight text-emerald-900/80">
              +{hiddenHighlights} more
            </span>
          )}
        </div>

        <div className="mt-auto flex justify-between gap-2.5 pt-3.5 text-[12px] font-bold text-emerald-700">
          <span>{activityCount(program.activities.length)}</span>
          <span className="shrink-0">View details →</span>
        </div>
      </div>
    </button>
  )
}
