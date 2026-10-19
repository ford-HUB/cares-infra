import { LandingCommunities } from '../../components/public/landing-communities'
import { LandingPageHeader } from '../../components/public/landing-page-header'
import { LandingPrograms } from '../../components/public/landing-programs'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'

export default function Programs() {
  return (
    <>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.programs} />
      <LandingPrograms />
      <LandingCommunities />
    </>
  )
}
