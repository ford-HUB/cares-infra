import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useActiveSection } from '../../hooks/use-active-section'
import { useScrolledPast } from '../../hooks/use-scrolled-past'
import { AUTH_MODAL_LINK_STATE } from '../../constants/auth-modal'
import { HOME_PATH, LOGIN_PATH, REQUEST_ACCESS_PATH } from '../../constants/routes'
import {
  LANDING_CONTAINER,
  LANDING_ACTIVE_SECTION_ROOT_MARGIN,
  LANDING_MOTION,
  LANDING_NAV_LINKS,
} from '../../constants/landing-bulletin'

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none'

const NAV_SECTION_IDS = LANDING_NAV_LINKS.map((link) => link.sectionId)

function navLinkClass(isActive: boolean) {
  return cn(
    'group relative shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
    FOCUS_RING,
    isActive
      ? 'font-semibold text-[var(--cares-primary)]'
      : 'text-[var(--cares-body)] hover:text-[var(--cares-primary)]',
  )
}

function NavUnderline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-[var(--cares-primary-hover)] transition-transform duration-300',
        active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
      )}
    />
  )
}

function NavLinks({ activeSectionId }: { activeSectionId: string }) {
  return LANDING_NAV_LINKS.map((link) => {
    const isActive = link.sectionId === activeSectionId

    return (
      <Link
        key={link.to}
        to={link.to}
        aria-current={isActive ? 'location' : undefined}
        className={navLinkClass(isActive)}
      >
        {link.label}
        <NavUnderline active={isActive} />
      </Link>
    )
  })
}

export function LandingHeader() {
  const scrolled = useScrolledPast(LANDING_MOTION.headerShadowOffsetPx)
  const activeSectionId = useActiveSection(NAV_SECTION_IDS, LANDING_ACTIVE_SECTION_ROOT_MARGIN)

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b backdrop-blur transition-[background-color,box-shadow,border-color] duration-300',
        scrolled
          ? 'border-[var(--cares-border)] bg-white/90 shadow-sm'
          : 'border-transparent bg-white',
      )}
    >
      <div className={`${LANDING_CONTAINER} flex h-14 items-center justify-between gap-4`}>
        <Link
          to={HOME_PATH}
          className={cn('group flex min-w-0 items-center gap-2.5 rounded-lg', FOCUS_RING)}
        >
          <img
            src="/transparent-logo.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-[var(--cares-border)] bg-white object-contain p-1 transition-transform duration-500 group-hover:rotate-12"
          />
          <span className="min-w-0 truncate text-[15px] font-semibold tracking-wide text-[var(--cares-heading)]">
            UCLM <span className="text-[var(--cares-primary-hover)]">CARES</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <NavLinks activeSectionId={activeSectionId} />
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            to={REQUEST_ACCESS_PATH}
            state={AUTH_MODAL_LINK_STATE}
            preventScrollReset
            className={cn(
              'hidden rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--cares-body)] transition-colors hover:bg-[var(--cares-bg)] lg:inline-flex',
              FOCUS_RING,
            )}
          >
            Request access
          </Link>
          <Link
            to={LOGIN_PATH}
            state={AUTH_MODAL_LINK_STATE}
            preventScrollReset
            className={cn(
              'rounded-lg bg-[var(--cares-primary)] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] focus-visible:ring-offset-2',
              FOCUS_RING,
            )}
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Below md the section links sit in their own scrollable row. */}
      <nav
        aria-label="Main"
        className="flex gap-1 overflow-x-auto border-t border-[var(--cares-border)] px-3 py-1.5 md:hidden"
      >
        <NavLinks activeSectionId={activeSectionId} />
      </nav>
    </header>
  )
}
