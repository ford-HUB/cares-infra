import { useId, useRef, useState } from 'react'
import { ChevronDown, Maximize2, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { generatePath, Link } from 'react-router-dom'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
} from '../../ui/dialog'
import { LANDING_SERIF } from '../../../constants/landing-bulletin'
import {
  bulletinPageAlt,
  bulletinPagePhoto,
  LANDING_PROGRAMS_COPY,
  type LandingDepartmentProgram,
  type LandingProgramActivity,
} from '../../../constants/landing-programs'
import { PROGRAM_BULLETIN_PAGE_PATH } from '../../../constants/routes'

const BADGE = 'rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700'

/** The whole card toggles its scanned bulletin page: the title's button stretches over
 *  the card with an ::after overlay, and the opened page sits above that overlay (z-10)
 *  so clicking the image or "Full display" doesn't fold it shut. */
function ActivityItem({ activity, order }: { activity: LandingProgramActivity; order: number }) {
  const [pageOpen, setPageOpen] = useState(false)
  const pageId = useId()

  return (
    <article
      className={`relative flex items-start gap-2.5 rounded-xl border bg-white p-3.5 transition-colors sm:gap-4 sm:p-4 ${
        pageOpen
          ? 'border-emerald-300'
          : 'border-[var(--cares-border)] hover:border-emerald-300 hover:bg-emerald-50/40'
      }`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[12px] font-extrabold text-emerald-700 sm:h-8 sm:w-8 sm:text-sm">
        {String(order).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-[15px] leading-snug font-bold text-[var(--cares-heading)]">
          <button
            type="button"
            aria-expanded={pageOpen}
            aria-controls={pageId}
            onClick={() => setPageOpen((open) => !open)}
            className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-emerald-300"
          >
            {activity.title}
          </button>
        </h4>
        {activity.date && (
          <div className="mt-1.5 mb-2 flex flex-wrap gap-1.5">
            <span className={BADGE}>{activity.date}</span>
          </div>
        )}
        <p
          className={`text-[13px] leading-relaxed text-[var(--cares-muted)] ${activity.date ? '' : 'mt-1'}`}
        >
          {activity.summary}
        </p>
        {pageOpen && (
          <div id={pageId} className="relative z-10 mt-2.5">
            <div className="mb-1.5 flex justify-end">
              <Link
                to={generatePath(PROGRAM_BULLETIN_PAGE_PATH, { page: String(activity.sourcePage) })}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 hover:underline"
              >
                <Maximize2 aria-hidden className="h-3.5 w-3.5" />
                {LANDING_PROGRAMS_COPY.fullDisplay}
              </Link>
            </div>
            <figure className="rounded-lg border border-[var(--cares-border)] bg-emerald-50/60 p-2">
              <img
                src={bulletinPagePhoto(activity.sourcePage)}
                alt={bulletinPageAlt(activity.sourcePage)}
                className="mx-auto block h-auto w-full max-w-[540px] rounded-sm shadow-md"
              />
            </figure>
          </div>
        )}
      </div>
      <ChevronDown
        aria-hidden
        className={`mt-0.5 h-5 w-5 shrink-0 text-emerald-700 transition-transform ${pageOpen ? 'rotate-180' : ''}`}
      />
    </article>
  )
}

interface LandingProgramDialogProps {
  program: LandingDepartmentProgram | null
  onClose: () => void
}

/** A department's official components and documented activities, with the scanned
 *  bulletin page behind each one. Full screen on phones. */
export function LandingProgramDialog({ program, onClose }: LandingProgramDialogProps) {
  // There's no DialogTrigger to hand focus back to, so remember the card that opened it.
  const openerRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog open={program !== null} onOpenChange={(open) => !open && onClose()}>
      {program && (
        <DialogPortal>
          <DialogOverlay className="bg-emerald-950/70 supports-backdrop-filter:backdrop-blur-none" />
          <DialogPrimitive.Content
            onOpenAutoFocus={() => {
              openerRef.current = document.activeElement as HTMLElement | null
            }}
            onCloseAutoFocus={() => openerRef.current?.focus()}
            // No tagline means no DialogDescription; opt out so Radix doesn't warn.
            {...(program.tagline ? {} : { 'aria-describedby': undefined })}
            className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(89vh,950px)] w-[min(930px,calc(100%-2.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none"
          >
            <header className="relative shrink-0 bg-gradient-to-r from-[var(--cares-primary)] to-emerald-800 px-5 py-5 text-white sm:px-8 sm:py-6">
              <p className="text-[11px] font-extrabold tracking-wider text-emerald-300 uppercase">
                Department
              </p>
              {/* The primitive directly: DialogTitle's class merge would drop the serif. */}
              <DialogPrimitive.Title
                className={`${LANDING_SERIF} mt-2 mr-12 text-[24px] leading-tight font-bold sm:text-[32px]`}
              >
                {program.department}
              </DialogPrimitive.Title>
              {program.tagline && (
                <DialogDescription className="mt-1.5 max-w-2xl text-[13px] text-emerald-50/90">
                  {program.tagline}
                </DialogDescription>
              )}
              <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-emerald-50">
                <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase">
                  Program
                </span>
                <span>{program.program}</span>
              </p>
              <DialogClose
                aria-label="Close activity details"
                className="absolute top-4 right-4 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/50 bg-white/15 transition-colors hover:bg-white/25 focus-visible:ring-3 focus-visible:ring-emerald-300 focus-visible:outline-none sm:top-5 sm:right-6"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
              {program.components.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-2.5 text-[15px] font-bold text-[var(--cares-primary)]">
                    Official program components
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {program.components.map((component) => (
                      <span
                        key={component}
                        className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-900/80"
                      >
                        {component}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {program.activities.length > 0 ? (
                <section>
                  <h3 className="mb-2.5 text-[15px] font-bold text-[var(--cares-primary)]">
                    Documented activities{' '}
                    <span className="text-[12px] font-medium text-[var(--cares-muted)]">
                      ({program.activities.length} entries)
                    </span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {program.activities.map((activity, index) => (
                      <ActivityItem
                        key={`${activity.pages}-${activity.title}`}
                        activity={activity}
                        order={index + 1}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="rounded-lg bg-emerald-50 p-4 text-[13px] leading-relaxed text-emerald-900/80">
                  {LANDING_PROGRAMS_COPY.noActivities}
                </p>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      )}
    </Dialog>
  )
}
