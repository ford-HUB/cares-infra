import type { ProfileInfo } from '../types/profile'

export function isPortalProfileComplete(
  profile: ProfileInfo | null,
  options?: { requireSignature?: boolean; isDirector?: boolean },
): boolean {
  if (!profile) return false
  if (profile.profile_complete === false) return false
  if (profile.profile_complete === true) return true

  const hasCore = options?.isDirector
    ? Boolean(
        profile.address?.city?.trim()
        && (profile.phone_number ?? profile.phone)?.trim(),
      )
    : Boolean(
        profile.department?.trim()
        && profile.address?.city?.trim()
        && (profile.phone_number ?? profile.phone)?.trim(),
      )

  if (!hasCore) return false
  if (options?.requireSignature && !profile.hasSignature) return false
  return true
}

export function mapGenderToForm(gender?: ProfileInfo['gender']): 'M' | 'F' {
  return gender === 'M' ? 'M' : 'F'
}
