import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { bulletinPageAlt, bulletinPagePhoto } from '../../constants/landing-programs'
import { PROGRAMS_PATH } from '../../constants/routes'

/** react-router's key for the first entry of a visit: nothing on the site to go back to. */
const FIRST_HISTORY_ENTRY_KEY = 'default'

/** One scanned bulletin page, filling the screen. */
export function LandingBulletinPageViewer({ page }: { page: number }) {
  const navigate = useNavigate()
  const { key } = useLocation()

  const goBack = () => {
    if (key === FIRST_HISTORY_ENTRY_KEY) navigate(PROGRAMS_PATH)
    else navigate(-1)
  }

  return (
    <div className="flex h-dvh flex-col bg-emerald-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex cursor-pointer items-center gap-1 rounded py-1 pr-2 text-[14px] font-semibold hover:text-emerald-200 focus-visible:ring-3 focus-visible:ring-emerald-300 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Back
        </button>
        <p className="text-[12px] text-emerald-100/80">Bulletin page {page}</p>
      </header>
      <main className="min-h-0 flex-1 px-2 pb-2 sm:px-4 sm:pb-4">
        <img
          src={bulletinPagePhoto(page)}
          alt={bulletinPageAlt(page)}
          className="h-full w-full object-contain"
        />
      </main>
    </div>
  )
}
