import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '../ui/input'
import {
  LANDING_DEPARTMENT_PROGRAMS,
  LANDING_PROGRAM_DEPARTMENT_PARAM,
  LANDING_PROGRAMS_COPY,
  type LandingDepartmentProgram,
} from '../../constants/landing-programs'
import { LandingHillsBackdrop } from './ui/landing-about-botanicals'
import { LandingProgramCard } from './ui/landing-program-card'
import { LandingProgramDialog } from './ui/landing-program-dialog'
import { LandingReveal } from './ui/landing-reveal'
import { LandingEyebrowHeading } from './ui/landing-eyebrow-heading'
import { LANDING_CONTAINER } from '../../constants/landing-bulletin'

const COLUMNS_XL = 4

const searchableText = (program: LandingDepartmentProgram) =>
  [
    program.department,
    program.program,
    program.tagline,
    ...program.highlights,
    ...program.components,
    ...program.activities.flatMap((activity) => [activity.title, activity.summary]),
  ]
    .join(' ')
    .toLocaleLowerCase()

export function LandingPrograms() {
  const [query, setQuery] = useState('')
  // In the URL, not state: coming back from a full-screen bulletin page reopens the dialog.
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get(LANDING_PROGRAM_DEPARTMENT_PARAM)
  const selected = LANDING_DEPARTMENT_PROGRAMS.find((program) => program.id === selectedId) ?? null

  const selectProgram = (program: LandingDepartmentProgram | null) =>
    setSearchParams(program ? { [LANDING_PROGRAM_DEPARTMENT_PARAM]: program.id } : {}, {
      replace: true,
      preventScrollReset: true,
    })

  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return LANDING_DEPARTMENT_PROGRAMS.filter((program) => searchableText(program).includes(term))
  }, [query])

  const activityTotal = matches.reduce((total, program) => total + program.activities.length, 0)

  return (
    <section className="relative overflow-clip bg-emerald-50 bg-[radial-gradient(circle_at_0_85%,rgb(184_228_199/0.5),transparent_35%),radial-gradient(circle_at_100%_70%,rgb(210_236_214/0.7),transparent_30%)]">
      {/* Mint tint closing on rolling hills, as under the org chart. */}
      <LandingHillsBackdrop />
      <div className={`${LANDING_CONTAINER} relative pt-14 pb-28 sm:pt-18 sm:pb-36`}>
        <LandingReveal>
          <div className="mx-auto max-w-5xl text-center">
            <LandingEyebrowHeading
              singleLine
              eyebrow={LANDING_PROGRAMS_COPY.eyebrow}
              title={LANDING_PROGRAMS_COPY.title}
              description={LANDING_PROGRAMS_COPY.description}
            />
          </div>
        </LandingReveal>

        <div className="mt-8 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--cares-muted)]" aria-live="polite">
            {matches.length} {matches.length === 1 ? 'department / unit' : 'departments / units'} ·{' '}
            {activityTotal} documented activity {activityTotal === 1 ? 'entry' : 'entries'}
          </p>
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cares-muted)]"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={LANDING_PROGRAMS_COPY.searchPlaceholder}
              aria-label={LANDING_PROGRAMS_COPY.searchPlaceholder}
              className="h-10 bg-white pl-9 shadow-sm"
            />
          </div>
        </div>

        {matches.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matches.map((program, index) => (
              <LandingReveal
                key={program.id}
                as="li"
                index={index % COLUMNS_XL}
                className="h-full"
              >
                <LandingProgramCard program={program} onSelect={selectProgram} />
              </LandingReveal>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-emerald-50 p-4 text-[14px] text-emerald-900/80">
            {LANDING_PROGRAMS_COPY.empty}
          </p>
        )}
      </div>

      <LandingProgramDialog program={selected} onClose={() => selectProgram(null)} />
    </section>
  )
}
