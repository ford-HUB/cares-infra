import { SettingsModuleLayout } from '../../components/settings/settings-module-layout'

export function DirectorSettingsLayout() {
  return (
    <SettingsModuleLayout
      basePath="/director/settings"
      profilePath="/director/profile"
      homePath="/director/overview"
    />
  )
}
