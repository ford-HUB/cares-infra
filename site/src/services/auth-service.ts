import { mapRoleTypeToStaffRole } from '../config/role-type-map'
import { SESSION_KEY, TOKEN_KEY } from '../constants/session'
import type {
  AdminLoginApiResponse,
  LoginPayload,
  MeApiResponse,
} from '../types/auth'
import type { ApiResponse, AuthUser } from '../types/staff-roles'
import {
  apiClient,
  parseApiError,
  toApiResponse,
  USE_MOCK_API,
} from './api-client'
import {
  mockCoordinatorUser,
  mockDirectorUser,
  mockStaffUser,
} from './mock-data'

/** Mock helper — infer role from email until backend returns role on login. */
function resolveMockRole(email: string) {
  const value = email.toLowerCase()
  if (value.includes('director')) return 'director' as const
  if (value.includes('assist')) return 'assistant_coordinator' as const
  if (value.includes('coord')) return 'coordinator' as const
  return 'staff' as const
}

const mockUsers = {
  director: mockDirectorUser,
  staff: mockStaffUser,
  coordinator: mockCoordinatorUser,
  assistant_coordinator: {
    ...mockCoordinatorUser,
    id: 'assist-1',
    email: 'assist.coord@uclm.edu.ph',
    role: 'assistant_coordinator' as const,
    firstName: 'Liza',
    lastName: 'Gomez',
  },
} as const

function mapLoginResponse(data: AdminLoginApiResponse): AuthUser {
  return {
    id: data.user_id,
    email: data.email,
    role: mapRoleTypeToStaffRole(data.role_type),
    firstName: data.firstname,
    lastName: data.lastname,
  }
}

function mapMeResponse(data: MeApiResponse): AuthUser {
  return {
    id: data.user_id,
    email: data.email,
    role: mapRoleTypeToStaffRole(data.role_type),
    firstName: data.firstname,
    lastName: data.lastname,
  }
}

export async function login(
  payload: LoginPayload,
): Promise<ApiResponse<AuthUser>> {
  if (USE_MOCK_API) {
    const role = resolveMockRole(payload.email)
    return {
      success: true,
      data: { ...mockUsers[role], email: payload.email },
    }
  }

  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: AdminLoginApiResponse
    }>('/api/v1/auth/admin/login', payload)

    const user = mapLoginResponse(body.data)
    persistSession(user, body.data.access_token)
    return toApiResponse(user)
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function getSession(): Promise<ApiResponse<AuthUser>> {
  if (USE_MOCK_API) {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      return { success: true, data: JSON.parse(stored) as AuthUser }
    }
    return { success: false, message: 'Not authenticated', data: null }
  }

  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) {
    return { success: false, message: 'Not authenticated', data: null }
  }

  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: MeApiResponse
    }>('/api/v1/auth/me')

    const user = mapMeResponse(body.data)
    persistSession(user, token)
    return toApiResponse(user)
  } catch (error) {
    clearSession()
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function logoutSession(): Promise<void> {
  clearSession()
}

export function persistSession(user: AuthUser, token?: string): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem('cares-director-session')
  sessionStorage.removeItem('cares-staff-session')
}
