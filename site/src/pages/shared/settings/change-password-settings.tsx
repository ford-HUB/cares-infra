import { ChangePasswordPanel } from '../../../components/settings/change-password-panel'
import { useChangePasswordForm } from '../../../hooks/use-change-password-form'

export function ChangePasswordSettingsPage() {
  const changePassword = useChangePasswordForm()

  return (
    <ChangePasswordPanel
      form={changePassword.form}
      onSubmit={changePassword.onSubmit}
      submitting={changePassword.submitting}
    />
  )
}
