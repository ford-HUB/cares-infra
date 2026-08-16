import {
  MANAGE_USERS_MAX_LOADED,
  MANAGE_USERS_PAGE_SIZE,
} from '../constants/manage-users'
import type {
  ManagedUser,
  ManagedUserDetail,
  ManageUsersQuery,
  ManageUsersResult,
} from '../types/manage-users'
import { apiClient, parseApiError } from './api-client'

interface ManagedUserApiResponse {
  user_id: string
  firstname: string
  lastname: string
  email: string
  role_type: string
  department: string | null
  status: 'active' | 'restricted' | 'pending'
  restriction_reason: string | null
  last_login_ip: string | null
  blocked_ips: string[]
  created_at: string
}

interface ManagedUserListApiResponse {
  items: ManagedUserApiResponse[]
  total: number
  page: number
  page_size: number
}

function mapApiUser(data: ManagedUserApiResponse): ManagedUser {
  return {
    id: data.user_id,
    email: data.email,
    firstName: data.firstname,
    lastName: data.lastname,
    role: data.role_type.toLowerCase(),
    status: data.status,
    department: data.department ?? undefined,
    restrictionReason: data.restriction_reason ?? undefined,
    lastLoginIp: data.last_login_ip ?? undefined,
    blockedIps: data.blocked_ips,
  }
}

async function fetchUserPage(query: ManageUsersQuery, page: number) {
  const { data: body } = await apiClient.get<{
    ok: true
    data: ManagedUserListApiResponse
  }>('/api/v1/users', {
    params: {
      ...(query.search ? { search: query.search } : {}),
      role: query.role && query.role !== 'all' ? query.role.toUpperCase() : 'all',
      status: query.status ?? 'all',
      page,
      page_size: MANAGE_USERS_PAGE_SIZE,
    },
  })

  return body.data
}

export async function listManagedUsers(
  query: ManageUsersQuery = {},
): Promise<ManageUsersResult> {
  try {
    const first = await fetchUserPage(query, 1)
    const list = first.items.map(mapApiUser)

    // The table paginates client-side, so pull the remaining pages up to the cap.
    const loadable = Math.min(first.total, MANAGE_USERS_MAX_LOADED)
    let page = 2
    while (list.length < loadable) {
      const next = await fetchUserPage(query, page)
      if (next.items.length === 0) break
      list.push(...next.items.map(mapApiUser))
      page += 1
    }

    return {
      success: true,
      list,
      total: first.total,
      truncated: first.total > list.length,
    }
  } catch (error) {
    return {
      success: false,
      message: parseApiError(error),
      list: [],
      total: 0,
      truncated: false,
    }
  }
}

interface MutationResult {
  success: boolean
  message?: string
  user?: ManagedUser
}

export async function restrictManagedUser(
  id: string,
  reason: string,
): Promise<MutationResult> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: ManagedUserApiResponse
    }>(`/api/v1/users/${id}/restrict`, { reason })
    return { success: true, message: 'User restricted', user: mapApiUser(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function unrestrictManagedUser(id: string): Promise<MutationResult> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: ManagedUserApiResponse
    }>(`/api/v1/users/${id}/unrestrict`)
    return { success: true, message: 'Restriction lifted', user: mapApiUser(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function blockManagedUserIp(
  id: string,
  payload: { ipAddress?: string; reason?: string },
): Promise<MutationResult> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: ManagedUserApiResponse
    }>(`/api/v1/users/${id}/block-ip`, {
      ...(payload.ipAddress ? { ip_address: payload.ipAddress } : {}),
      ...(payload.reason ? { reason: payload.reason } : {}),
    })
    return { success: true, message: 'IP address blocked', user: mapApiUser(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function unblockManagedUserIp(
  id: string,
  ipAddress?: string,
): Promise<MutationResult> {
  try {
    const { data: body } = await apiClient.delete<{
      ok: true
      data: ManagedUserApiResponse
    }>(`/api/v1/users/${id}/block-ip`, {
      params: ipAddress ? { ip_address: ipAddress } : undefined,
    })
    return { success: true, message: 'IP address unblocked', user: mapApiUser(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

interface ManagedUserDetailApiResponse extends ManagedUserApiResponse {
  middle_name: string | null
  gender: string
  age: number
  phone_number: string
  current_address: string
  address: {
    street: string | null
    barangay: string | null
    city: string | null
    province: string | null
  }
  has_avatar: boolean
  has_signature: boolean
  restricted_at: string | null
  updated_at: string
  school_info: {
    id_number: string
    department: string
    major: string
    year_level: string
    graduation_date: string
  } | null
  verifications: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; submitted_at: string }[]
  interests: string[]
  blocked_ip_details: {
    ip_address: string
    reason: string | null
    blocked_at: string
  }[]
}

function mapApiUserDetail(data: ManagedUserDetailApiResponse): ManagedUserDetail {
  return {
    ...mapApiUser(data),
    middleName: data.middle_name ?? undefined,
    gender: data.gender,
    age: data.age,
    phoneNumber: data.phone_number,
    currentAddress: data.current_address,
    address: {
      street: data.address.street ?? undefined,
      barangay: data.address.barangay ?? undefined,
      city: data.address.city ?? undefined,
      province: data.address.province ?? undefined,
    },
    hasAvatar: data.has_avatar,
    hasSignature: data.has_signature,
    restrictedAt: data.restricted_at ?? undefined,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
    schoolInfo: data.school_info
      ? {
          idNumber: data.school_info.id_number,
          department: data.school_info.department,
          major: data.school_info.major,
          yearLevel: data.school_info.year_level,
          graduationDate: data.school_info.graduation_date,
        }
      : undefined,
    verifications: data.verifications.map((verification) => ({
      status: verification.status,
      submittedAt: verification.submitted_at,
    })),
    interests: data.interests,
    blockedIpDetails: data.blocked_ip_details.map((blocked) => ({
      ipAddress: blocked.ip_address,
      reason: blocked.reason ?? undefined,
      blockedAt: blocked.blocked_at,
    })),
  }
}

export async function getManagedUserDetail(id: string): Promise<{
  success: boolean
  message?: string
  detail?: ManagedUserDetail
}> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: ManagedUserDetailApiResponse
    }>(`/api/v1/users/${id}`)
    return { success: true, detail: mapApiUserDetail(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}
