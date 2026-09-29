import { SettingsModuleLayout } from '../../components/settings/settings-module-layout'
import {
  ADMIN_OVERVIEW_PATH,
  ADMIN_PROFILE_PATH,
  ADMIN_SETTINGS_PATH,
} from '../../constants/routes'

export function AdminSettingsLayout() {
  return (
    <SettingsModuleLayout
      basePath={ADMIN_SETTINGS_PATH}
      profilePath={ADMIN_PROFILE_PATH}
      homePath={ADMIN_OVERVIEW_PATH}
    />
  )
}
