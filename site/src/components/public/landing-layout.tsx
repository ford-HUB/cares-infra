import { Outlet } from 'react-router-dom'
import { useRealignHashAfterFonts } from '../../hooks/use-realign-hash-after-fonts'
import { LandingFooter } from './landing-footer'
import { LandingHeader } from './landing-header'

/** Shell for the public site: shared header and footer around the single page. */
export function LandingLayout() {
  useRealignHashAfterFonts()

  return (
    <div className="cares-landing flex min-h-screen flex-col bg-[var(--cares-bg)]">
      <LandingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  )
}
