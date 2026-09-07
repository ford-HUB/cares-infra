import { Link } from 'react-router-dom'
import { LOGIN_PATH, REQUEST_ACCESS_PATH } from '../../constants/routes'

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--cares-border)] bg-[var(--cares-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/transparent-logo.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-[var(--cares-border)] bg-white object-contain p-1"
          />
          <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--cares-heading)]">
            CARES <span className="font-normal text-[var(--cares-muted)]">Administrator Portal</span>
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          <Link
            to={REQUEST_ACCESS_PATH}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--cares-body)] transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            Request access
          </Link>
          <Link
            to={LOGIN_PATH}
            className="rounded-lg bg-[var(--cares-primary)] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  )
}
