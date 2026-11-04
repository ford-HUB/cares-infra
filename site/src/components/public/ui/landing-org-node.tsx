import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANDING_SERIF } from '../../../constants/landing-bulletin'
import { GlassSheen } from './landing-glass-sheen'
import { useReveal } from '../../../hooks/use-reveal'
import type {
  LandingOrgMember,
  LandingOrgPerson,
  LandingOrgUnit,
} from '../../../constants/landing-org'

interface LandingOrgPersonNodeProps {
  person: LandingOrgPerson
  emphasis?: boolean
}

/* Hover or tap, shared by every card: a slow, settling lift (400ms ease-out, no
 * overshoot) while the edge turns mint with a soft mint glow, as on the Objectives cards. */
const ORG_HOVER =
  'transition-[translate,border-color,box-shadow] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-emerald-400 hover:shadow-[0_0_0_3px_rgba(110,231,183,0.35),0_14px_30px_-14px_rgba(16,185,129,0.45)] active:border-emerald-400 motion-safe:hover:-translate-y-1'

/** The brighter mint wash that fades in behind a light card's content on hover or tap,
 *  the same as on the Objectives cards. Needs a `group` card. */
function MintWash() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-gradient-to-br from-emerald-100 to-emerald-200/70 opacity-0 transition-opacity duration-[400ms] ease-out group-hover:opacity-100 group-active:opacity-100"
    />
  )
}

/* Frosted-glass surfaces: a translucent gradient, a bright top edge and a soft green
 * glow. The emphasised node is a single, solid mid green. */
const GLASS_NODE =
  'relative isolate overflow-hidden border border-black/40 bg-gradient-to-br from-white/85 via-emerald-50/70 to-green-100/60 text-gray-900 shadow-[0_12px_30px_-14px_rgba(21,128,61,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md'
/** The department cards: warm cream, with the same edge, shadow and light as the glass. */
const GLASS_UNIT =
  'relative isolate overflow-hidden border border-black/40 bg-[var(--cares-about-card)] shadow-[0_12px_28px_-16px_rgba(21,128,61,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md'
const GLASS_NODE_EMPHASIS =
  'relative isolate overflow-hidden border border-black/40 bg-[#13893f] text-white shadow-[0_14px_34px_-14px_rgba(20,83,45,0.7),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md'

/** One named position in the chart's spine: portrait, name, title. */
export function LandingOrgPersonNode({ person, emphasis = false }: LandingOrgPersonNodeProps) {
  return (
    <div
      className={cn(
        'group grid w-full max-w-sm grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3 rounded-2xl px-5 py-3',
        ORG_HOVER,
        emphasis ? GLASS_NODE_EMPHASIS : GLASS_NODE,
      )}
    >
      <GlassSheen emphasis={emphasis} />
      {!emphasis && <MintWash />}
      <span
        className={cn(
          'h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-md ring-2 ring-white',
          !emphasis && 'group-hover:ring-emerald-200',
        )}
      >
        <img
          src={person.photo}
          alt={person.name}
          loading="lazy"
          className="h-full w-full scale-110 object-cover object-top"
        />
      </span>
      {/* The empty column after the text mirrors the portrait's, so the name and title
          centre on the card itself, in line with the connector above and below. */}
      <div className="min-w-0 text-center">
        <p className={`${LANDING_SERIF} text-[15px] leading-snug font-bold text-balance`}>
          {person.name}
        </p>
        <p
          className={cn(
            'mt-0.5 text-[11px] leading-snug tracking-wider text-balance uppercase',
            emphasis ? 'text-emerald-100' : 'text-[#105a31]',
          )}
        >
          {person.role}
        </p>
      </div>
    </div>
  )
}

function LandingOrgPortrait({
  member,
  department,
  className,
}: {
  member: LandingOrgMember
  department: string
  className: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100 transition-[box-shadow] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:ring-emerald-400',
        className,
      )}
    >
      {member.photo ? (
        <img
          src={member.photo}
          alt={member.name ?? `${department} ${member.title}`}
          loading="lazy"
          className="h-full w-full scale-110 object-cover object-top"
        />
      ) : (
        <UserRound aria-hidden className="h-1/2 w-1/2" />
      )}
    </span>
  )
}

/* Coordinator portraits get a dark CARES-green ring with a white gap, which stays put on
 * hover; assistants keep the plain one. */
const COORDINATOR_RING =
  'ring-[var(--cares-primary)] ring-offset-2 ring-offset-white group-hover:ring-[var(--cares-primary)]'

/** A department's coordinators, its name on a dark-green pill, then any assistant coordinator
 *  set apart at the foot. */
export function LandingOrgUnitCard({ unit }: { unit: LandingOrgUnit }) {
  const coordinators = unit.members.filter((member) => !member.assistant)
  const assistants = unit.members.filter((member) => member.assistant)
  const shared = coordinators.length > 1

  return (
    <div
      className={cn(
        `group ${GLASS_UNIT} flex h-full flex-col items-center rounded-2xl p-3 pt-4 text-center ${ORG_HOVER}`,
        // With no assistant row to anchor the foot, the coordinator sits mid-card.
        assistants.length === 0 && 'justify-center pb-4',
      )}
    >
      <GlassSheen ripples />
      <MintWash />
      <div className="flex w-full justify-center gap-2">
        {coordinators.map((member) => (
          <div key={member.title} className="flex min-w-0 flex-1 flex-col items-center">
            <LandingOrgPortrait
              member={member}
              department={unit.department}
              className={cn(COORDINATOR_RING, shared ? 'h-16 w-16' : 'h-20 w-20')}
            />
            <p
              className={cn(
                'mt-3 leading-snug font-bold text-gray-900',
                shared ? 'w-full text-[12.5px] break-words' : 'text-[15px] text-balance',
              )}
            >
              {member.name ?? member.title}
            </p>
            {/* A shared department tells its coordinators apart by programme. */}
            {shared && member.name && (
              <p className="text-[11px] leading-snug font-medium text-emerald-800">{member.title}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 rounded-full bg-gradient-to-b from-green-800/85 to-[var(--cares-primary)]/85 px-5 py-1 text-[11px] leading-snug font-semibold tracking-wide text-balance text-white uppercase shadow-sm ring-1 ring-white/30">
        {unit.department}
      </p>

      {assistants.length > 0 && (
        <ul className="mt-auto w-full pt-3">
          {assistants.map((member) => (
            <li
              key={member.title}
              className="flex items-center justify-center gap-2.5 border-t border-[var(--cares-primary)] pt-2.5 text-left"
            >
              <LandingOrgPortrait member={member} department={unit.department} className="h-9 w-9" />
              <div className="min-w-0">
                {member.name && (
                  <p className="text-[12.5px] leading-snug font-bold text-gray-900">{member.name}</p>
                )}
                <p className="text-[11.5px] leading-snug text-gray-700">{member.title}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** An unnamed group in the chart (faculty, students). */
export function LandingOrgGroupNode({ label }: { label: string }) {
  return (
    <div
      className={`${LANDING_SERIF} ${ORG_HOVER} w-full max-w-xs rounded-2xl border border-dashed border-white/50 bg-gradient-to-b from-green-800 to-[var(--cares-primary)] px-4 py-3 text-center text-[14px] leading-snug font-bold text-balance text-white shadow-md`}
    >
      {label}
    </div>
  )
}

/** Vertical link in the spine. It draws itself downward on first view. */
export function LandingOrgConnector({ className }: { className?: string }) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.6)

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'mx-auto block h-8 w-px origin-top bg-black motion-safe:transition-transform motion-safe:duration-500',
        visible ? 'scale-y-100' : 'motion-safe:scale-y-0',
        className,
      )}
    />
  )
}
