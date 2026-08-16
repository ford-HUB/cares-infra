import { mapRoleTypeToPortalRole } from '../config/role-type-map'
import { SESSION_KEY, TOKEN_KEY } from '../constants/session'
import type {
  AdminLoginApiResponse,
  LoginPayload,
  MeApiResponse,
} from '../types/auth'
import type { ApiResponse, AuthUser } from '../types/portal-roles'
import {
  apiClient,
  parseApiError,
  toApiResponse,
} from './api-client'
function mapLoginResponse(data: AdminLoginApiResponse): AuthUser {
  return {
    id: data.user_id,
    email: data.email,
    role: mapRoleTypeToPortalRole(data.role_type),
    firstName: data.firstname,
    lastName: data.lastname,
  }
}

function mapMeResponse(data: MeApiResponse): AuthUser {
  return {
    id: data.user_id,
    email: data.email,
    role: mapRoleTypeToPortalRole(data.role_type),
    firstName: data.firstname,
    lastName: data.lastname,
    isProtected: data.is_protected,
  }
}

export async function login(
  payload: LoginPayload,
): Promise<ApiResponse<AuthUser>> {
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
}
