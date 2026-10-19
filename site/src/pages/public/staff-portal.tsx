import { LandingPageHeader } from '../../components/public/landing-page-header'
import { LandingPortal } from '../../components/public/landing-portal'
import { LANDING_PAGE_HEADERS } from '../../constants/landing-home'

export default function StaffPortal() {
  return (
    <>
      <LandingPageHeader {...LANDING_PAGE_HEADERS.portal} />
      <LandingPortal />
    </>
  )
}
