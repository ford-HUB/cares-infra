import { ChangeEmailPanel } from '../../../components/settings/change-email-panel'
import { useChangeEmailForm } from '../../../hooks/use-change-email-form'
import { useAuthStore } from '../../../store/auth-store'

export function ChangeEmailSettingsPage() {
  const user = useAuthStore((s) => s.user)
  const changeEmail = useChangeEmailForm(user?.email)

  return (
    <ChangeEmailPanel
      form={changeEmail.form}
      onSubmit={changeEmail.onSubmit}
      submitting={changeEmail.submitting}
      currentEmail={user?.email}
    />
  )
}
