import type { ProfileInfo } from '../types/profile'
import type { PortalProfileApiResponse } from '../types/profile-api'
import { apiClient, parseApiError, USE_MOCK_API } from './api-client'
import { mockStaffUser } from './mock-data'

const mockProfile: ProfileInfo = {
  firstname: mockStaffUser.firstName,
  lastname: mockStaffUser.lastName,
  email: mockStaffUser.email,
  department: 'Office of Student Affairs',
  phone_number: '+63 912 345 6789',
  gender: 'F',
  profile_complete: true,
  address: {
    street: 'UCLM Campus',
    barangay: 'Looc',
    city: 'Mandaue City',
    province: 'Cebu',
  },
}

const mockDirectorProfile: ProfileInfo = {
  firstname: 'Maria',
  lastname: 'Santos',
  email: 'director@uclm.edu.ph',
  phone_number: '+63 917 000 0000',
  gender: 'F',
  profile_complete: true,
  address: {
    street: 'UCLM Campus',
    barangay: 'Looc',
    city: 'Mandaue City',
    province: 'Cebu',
  },
}

function mapGenderFromApi(gender: string): ProfileInfo['gender'] {
  if (gender === 'MALE') return 'M'
  if (gender === 'FEMALE') return 'F'
  return undefined
}

function mapGenderToApi(gender: 'M' | 'F'): 'MALE' | 'FEMALE' {
  return gender === 'M' ? 'MALE' : 'FEMALE'
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
  gender: 'M' | 'F'
  department?: string
  address_street: string
  address_barangay: string
  address_city: string
  address_province: string
  avatar?: File | null
  signature?: File | null
}

export async function getCurrentStaffProfile() {
  if (USE_MOCK_API) {
    return { success: true as const, data: mockProfile }
  }

  try {
    const data = await fetchPortalProfile()
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}

export async function getCurrentDirectorProfile() {
  if (USE_MOCK_API) {
    return { success: true as const, data: mockDirectorProfile }
  }

  try {
    const data = await fetchPortalProfile()
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}

export async function updatePortalProfile(payload: UpdatePortalProfilePayload) {
  if (USE_MOCK_API) {
    return {
      success: true as const,
      message: 'Profile updated (mock)',
      data: {
        ...mockProfile,
        firstname: payload.firstname,
        lastname: payload.lastname,
        phone_number: payload.phone_number,
        gender: payload.gender,
        ...(payload.department ? { department: payload.department } : {}),
        address: {
          street: payload.address_street,
          barangay: payload.address_barangay,
          city: payload.address_city,
          province: payload.address_province,
        },
      } satisfies ProfileInfo,
    }
  }

  try {
    const form = new FormData()
    form.append('firstname', payload.firstname)
    form.append('lastname', payload.lastname)
    form.append('phone_number', payload.phone_number)
    form.append('gender', mapGenderToApi(payload.gender))
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

/** @deprecated Use updatePortalProfile */
export async function updateStaffProfile(_payload: Partial<ProfileInfo>) {
  if (USE_MOCK_API) {
    return { success: true as const, message: 'Profile updated (mock)' }
  }
  return { success: false as const, message: 'Use updatePortalProfile with full payload' }
}
