import { LandingAbout } from '../../components/public/landing-about'
import { LandingOrgChart } from '../../components/public/landing-org-chart'
import { LandingPageHeader } from '../../components/public/landing-page-header'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'

export default function About() {
  return (
    <>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.about} />
      <LandingAbout />
      <LandingOrgChart />
    </>
  )
}
