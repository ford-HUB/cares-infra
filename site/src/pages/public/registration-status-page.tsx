import { AlertTriangle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  RegistrationStatusCard,
  RegistrationStatusCardSkeleton,
} from '../../components/public/registration-status-card'
import { HOME_PATH } from '../../constants/routes'
import { useRegistrationStatus } from '../../hooks/use-registration-status'

/** Public page behind the "Check status" button in the registration-submitted email. */
export default function RegistrationStatusPage() {
  const [params] = useSearchParams()
  const state = useRegistrationStatus(params.get('token'))

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[var(--cares-portal-bg)] px-4 py-10 sm:py-16">
      <Link to={HOME_PATH} className="mb-6 flex items-center gap-2" aria-label="CARES home">
        <img src="/transparent-logo.png" alt="" className="h-10 w-10" />
        <span className="text-[15px] font-bold tracking-wide text-[var(--cares-primary)]">CARES</span>
      </Link>

      <main className="w-full max-w-md">
        <p className="mb-3 text-center text-[12px] font-semibold tracking-[0.12em] text-[var(--cares-muted)] uppercase">
          Registration status
        </p>
        {state.phase === 'loading' && <RegistrationStatusCardSkeleton />}
        {state.phase === 'ready' && <RegistrationStatusCard status={state.status} />}
        {state.phase === 'error' && (
          <div className="w-full rounded-2xl bg-white p-6 text-center shadow-[0_6px_24px_rgba(27,67,50,0.10)] ring-1 ring-black/5 sm:p-8">
            <AlertTriangle aria-hidden className="mx-auto h-8 w-8 text-amber-600" />
            <h1 className="mt-3 text-[18px] font-bold text-[var(--cares-heading)]">
              We couldn't open this status link
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--cares-body)]">{state.message}</p>
          </div>
        )}
      </main>
    </div>
  )
}
