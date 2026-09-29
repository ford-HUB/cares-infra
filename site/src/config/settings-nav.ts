import { KeyRound, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SettingsNavItem {
  label: string
  segment: string
  icon: LucideIcon
  description: string
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    label: 'Change email',
    segment: 'email',
    icon: Mail,
    description: 'Update your sign-in email address',
  },
  {
    label: 'Change password',
    segment: 'password',
    icon: KeyRound,
    description: 'Set a new account password',
  },
]
