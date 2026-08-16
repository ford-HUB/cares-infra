import {
  ACCESS_USERS_MAX_LOADED,
  ACCESS_USERS_PAGE_SIZE,
} from '../constants/access-control'
import type {
  AccessCatalog,
  AccessUser,
  AccessUserDetail,
  AccessUsersQuery,
  AccessUsersResult,
  PermissionKey,
} from '../types/access-control'
import { apiClient, parseApiError } from './api-client'

interface AccessUserApiResponse {
  user_id: string
  firstname: string
  lastname: string
  email: string
  role_type: string
  department: string | null
  is_restricted: boolean
  is_protected: boolean
  effective_permissions: string[]
  granted_count: number
  revoked_count: number
  suspended_count: number
  latest_suspension_reason: string | null
}

interface AccessUserListApiResponse {
  items: AccessUserApiResponse[]
  total: number
  page: number
  page_size: number
}

interface AccessUserDetailApiResponse extends AccessUserApiResponse {
  role_permissions: string[]
  overrides: {
    permission: string
    effect: 'GRANT' | 'REVOKE'
    reason: string | null
    granted_by_user_id: string
    updated_at: string
  }[]
  suspensions: {
    suspension_id: string
    permission: string
    reason: string
    issued_by_user_id: string
    issued_at: string
    expires_at: string | null
    lifted_at: string | null
    active: boolean
  }[]
}

interface AccessCatalogApiResponse {
  permissions: {
    key: string
    module: string
    label: string
    description: string
    sensitive: boolean
  }[]
  modules: string[]
  roles: { role_type: string; permissions: string[] }[]
}

function mapApiUser(data: AccessUserApiResponse): AccessUser {
  return {
    id: data.user_id,
    email: data.email,
    firstName: data.firstname,
    lastName: data.lastname,
    role: data.role_type.toLowerCase(),
    department: data.department ?? undefined,
    isRestricted: data.is_restricted,
    isProtected: data.is_protected,
    effectivePermissions: data.effective_permissions,
    grantedCount: data.granted_count,
    revokedCount: data.revoked_count,
    suspendedCount: data.suspended_count,
    latestSuspensionReason: data.latest_suspension_reason ?? undefined,
  }
}

function mapApiUserDetail(data: AccessUserDetailApiResponse): AccessUserDetail {
  return {
    ...mapApiUser(data),
    rolePermissions: data.role_permissions,
    overrides: data.overrides.map((override) => ({
      permission: override.permission,
      effect: override.effect,
      reason: override.reason ?? undefined,
      grantedByUserId: override.granted_by_user_id,
      updatedAt: override.updated_at,
    })),
    suspensions: data.suspensions.map((suspension) => ({
      id: suspension.suspension_id,
      permission: suspension.permission,
      reason: suspension.reason,
      issuedByUserId: suspension.issued_by_user_id,
      issuedAt: suspension.issued_at,
      expiresAt: suspension.expires_at ?? undefined,
      liftedAt: suspension.lifted_at ?? undefined,
      active: suspension.active,
    })),
  }
}

export async function getAccessCatalog(): Promise<{
  success: boolean
  message?: string
  catalog?: AccessCatalog
}> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: AccessCatalogApiResponse
    }>('/api/v1/access-control/catalog')

    return {
      success: true,
      catalog: {
        permissions: body.data.permissions,
        modules: body.data.modules,
        roles: body.data.roles.map((role) => ({
          role: role.role_type.toLowerCase(),
          permissions: role.permissions,
        })),
      },
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

async function fetchUserPage(query: AccessUsersQuery, page: number) {
  const { data: body } = await apiClient.get<{
    ok: true
    data: AccessUserListApiResponse
  }>('/api/v1/access-control/users', {
    params: {
      ...(query.search ? { search: query.search } : {}),
      role: query.role && query.role !== 'all' ? query.role.toUpperCase() : 'all',
      rights: query.rights ?? 'all',
      page,
      page_size: ACCESS_USERS_PAGE_SIZE,
    },
  })

  return body.data
}

export async function listAccessUsers(
  query: AccessUsersQuery = {},
): Promise<AccessUsersResult> {
  try {
    const first = await fetchUserPage(query, 1)
    const list = first.items.map(mapApiUser)

    // The table paginates client-side, so pull the remaining pages up to the cap.
    const loadable = Math.min(first.total, ACCESS_USERS_MAX_LOADED)
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

interface DetailResult {
  success: boolean
  message?: string
  detail?: AccessUserDetail
}

export async function getAccessUserDetail(id: string): Promise<DetailResult> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: AccessUserDetailApiResponse
    }>(`/api/v1/access-control/users/${id}`)
    return { success: true, detail: mapApiUserDetail(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

/** Sends the complete set of rights the user should end up with — the server diffs it. */
export async function updateAccessUserPermissions(
  id: string,
  permissions: PermissionKey[],
  reason?: string,
): Promise<DetailResult> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: AccessUserDetailApiResponse
    }>(`/api/v1/access-control/users/${id}/permissions`, {
      permissions,
      ...(reason ? { reason } : {}),
    })
    return {
      success: true,
      message: 'Access rights updated',
      detail: mapApiUserDetail(body.data),
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function suspendAccessUserActions(
  id: string,
  payload: {
    permissions: PermissionKey[]
    reason: string
    expiresAt?: string
  },
): Promise<DetailResult> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: AccessUserDetailApiResponse
    }>(`/api/v1/access-control/users/${id}/suspensions`, {
      permissions: payload.permissions,
      reason: payload.reason,
      ...(payload.expiresAt ? { expires_at: payload.expiresAt } : {}),
    })
    return {
      success: true,
      message: 'Actions suspended',
      detail: mapApiUserDetail(body.data),
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function liftAccessUserSuspension(
  id: string,
  suspensionId: string,
): Promise<DetailResult> {
  try {
    const { data: body } = await apiClient.delete<{
      ok: true
      data: AccessUserDetailApiResponse
    }>(`/api/v1/access-control/users/${id}/suspensions/${suspensionId}`)
    return {
      success: true,
      message: 'Suspension lifted',
      detail: mapApiUserDetail(body.data),
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

export async function updateRoleBaseline(
  role: string,
  permissions: PermissionKey[],
): Promise<{
  success: boolean
  message?: string
  role?: string
  permissions?: PermissionKey[]
}> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: { role_type: string; permissions: string[] }
    }>(`/api/v1/access-control/roles/${role.toUpperCase()}/permissions`, {
      permissions,
    })
    return {
      success: true,
      message: 'Role baseline updated',
      role: body.data.role_type.toLowerCase(),
      permissions: body.data.permissions,
    }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}
