import { Outlet, ScrollRestoration } from 'react-router-dom'
import { LandingFooter } from './landing-footer'
import { LandingHeader } from './landing-header'

/** Shell for the public site: shared header and footer around each page. */
export function LandingLayout() {
  return (
    <div className="cares-landing flex min-h-screen flex-col bg-[var(--cares-bg)]">
      <LandingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter />
      <ScrollRestoration />
    </div>
  )
}
