import { Link } from 'react-router-dom'
import { LOGIN_PATH } from '../../config/auth-redirect'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--cares-bg)] p-8 text-center">
      <img src="/transparent-logo.png" alt="CARES" className="h-20 w-20 object-contain" />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CARES Administrator Portal</h1>
        <p className="mt-2 max-w-lg text-base text-gray-600">
          Sign in once as Director, Staff, Coordinator, or Assistant Coordinator. Backend
          wiring is deferred — mock services are enabled by default.
        </p>
      </div>
      <Link
        to={LOGIN_PATH}
        className="rounded-lg bg-[var(--cares-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--cares-primary-hover)]"
      >
        Sign in
      </Link>
    </div>
  )
}
