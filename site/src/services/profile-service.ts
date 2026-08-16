import type { ProfileInfo } from '../types/profile'
import type { PortalProfileApiResponse } from '../types/profile-api'
import { apiClient, parseApiError } from './api-client'
function mapGenderFromApi(gender: string): ProfileInfo['gender'] {
  if (gender === 'MALE') return 'M'
  if (gender === 'FEMALE') return 'F'
  return 'O'
}

function mapGenderToApi(gender: 'M' | 'F' | 'O'): 'MALE' | 'FEMALE' | 'OTHER' {
  if (gender === 'M') return 'MALE'
  if (gender === 'F') return 'FEMALE'
  return 'OTHER'
}

function mapApiProfile(data: PortalProfileApiResponse): ProfileInfo {
  return {
    firstname: data.firstname,
    lastname: data.lastname,
    email: data.email,
    hasProfileImage: data.has_profile_image,
    hasSignature: data.has_signature,
    department: data.department ?? undefined,
    phone_number: data.phone_number,
    gender: mapGenderFromApi(data.gender),
    age: data.age,
    profile_complete: data.profile_complete,
    address: {
      street: data.address.street ?? undefined,
      barangay: data.address.barangay ?? undefined,
      city: data.address.city ?? undefined,
      province: data.address.province ?? undefined,
    },
  }
}

async function fetchPortalProfile(): Promise<ProfileInfo | null> {
  const { data: body } = await apiClient.get<{
    ok: true
    data: PortalProfileApiResponse
  }>('/api/v1/profile/me')

  return mapApiProfile(body.data)
}

export interface UpdatePortalProfilePayload {
  firstname: string
  lastname: string
  phone_number: string
  gender: 'M' | 'F' | 'O'
  age: number
  department?: string
  address_street: string
  address_barangay: string
  address_city: string
  address_province: string
  avatar?: File | null
  signature?: File | null
}

export async function getCurrentPortalProfile() {
  try {
    const data = await fetchPortalProfile()
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}

export async function updatePortalProfile(payload: UpdatePortalProfilePayload) {
  try {
    const form = new FormData()
    form.append('firstname', payload.firstname)
    form.append('lastname', payload.lastname)
    form.append('phone_number', payload.phone_number)
    form.append('gender', mapGenderToApi(payload.gender))
    form.append('age', String(payload.age))
    if (payload.department) {
      form.append('department', payload.department)
    }
    form.append('address_street', payload.address_street)
    form.append('address_barangay', payload.address_barangay)
    form.append('address_city', payload.address_city)
    form.append('address_province', payload.address_province)

    if (payload.avatar) {
      form.append('avatar', payload.avatar)
    }
    if (payload.signature) {
      form.append('signature', payload.signature)
    }

    const { data: body } = await apiClient.put<{
      ok: true
      data: PortalProfileApiResponse
    }>('/api/v1/profile/me', form)

    return {
      success: true as const,
      message: 'Profile updated',
      data: mapApiProfile(body.data),
    }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}

