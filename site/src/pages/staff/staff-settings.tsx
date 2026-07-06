import { SettingsModuleLayout } from '../../components/settings/settings-module-layout'

export function StaffSettingsLayout() {
  return (
    <SettingsModuleLayout
      basePath="/management/settings"
      profilePath="/management/profile"
      homePath="/management/dashboard"
    />
  )
}
