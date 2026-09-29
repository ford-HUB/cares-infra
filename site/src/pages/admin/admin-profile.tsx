import { ADMIN_OVERVIEW_PATH } from '../../constants/routes'
import { ProfilePage } from '../shared/profile-page'

export function AdminProfile() {
  return <ProfilePage homePath={ADMIN_OVERVIEW_PATH} />
}
