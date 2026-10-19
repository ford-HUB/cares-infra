import { LandingHighlights } from '../../components/public/landing-highlights'
import { LandingPageHeader } from '../../components/public/landing-page-header'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'

export default function Highlights() {
  return (
    <>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.highlights} />
      <LandingHighlights />
    </>
  )
}
