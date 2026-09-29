import type { SecurityPolicy, SecurityPolicyDetail, SecurityPolicyResult } from '../types/security-policy'
import { apiClient, parseApiError } from './api-client'

interface SecurityPolicyApiResponse {
  password_min_length: number
  password_require_uppercase: boolean
  password_require_lowercase: boolean
  password_require_number: boolean
  password_require_symbol: boolean

  lockout_enabled: boolean
  lockout_max_attempts: number
  lockout_window_minutes: number
  lockout_duration_minutes: number

  session_idle_timeout_minutes: number
  session_max_duration_hours: number
  max_concurrent_sessions: number

  login_hours_enabled: boolean
  login_hours_start_minute: number
  login_hours_end_minute: number

  ip_allowlist: string[]

  updated_by_user_id: string | null
  updated_at: string | null
}

function mapFromApi(data: SecurityPolicyApiResponse): SecurityPolicyDetail {
  return {
    passwordMinLength: data.password_min_length,
    passwordRequireUppercase: data.password_require_uppercase,
    passwordRequireLowercase: data.password_require_lowercase,
    passwordRequireNumber: data.password_require_number,
    passwordRequireSymbol: data.password_require_symbol,

    lockoutEnabled: data.lockout_enabled,
    lockoutMaxAttempts: data.lockout_max_attempts,
    lockoutWindowMinutes: data.lockout_window_minutes,
    lockoutDurationMinutes: data.lockout_duration_minutes,

    sessionIdleTimeoutMinutes: data.session_idle_timeout_minutes,
    sessionMaxDurationHours: data.session_max_duration_hours,
    maxConcurrentSessions: data.max_concurrent_sessions,

    loginHoursEnabled: data.login_hours_enabled,
    loginHoursStartMinute: data.login_hours_start_minute,
    loginHoursEndMinute: data.login_hours_end_minute,

    ipAllowlist: data.ip_allowlist,

    updatedByUserId: data.updated_by_user_id ?? undefined,
    updatedAt: data.updated_at ?? undefined,
  }
}

/** The server rejects unknown keys, so the payload carries the settings and nothing else. */
function mapToApi(policy: SecurityPolicy) {
  return {
    password_min_length: policy.passwordMinLength,
    password_require_uppercase: policy.passwordRequireUppercase,
    password_require_lowercase: policy.passwordRequireLowercase,
    password_require_number: policy.passwordRequireNumber,
    password_require_symbol: policy.passwordRequireSymbol,

    lockout_enabled: policy.lockoutEnabled,
    lockout_max_attempts: policy.lockoutMaxAttempts,
    lockout_window_minutes: policy.lockoutWindowMinutes,
    lockout_duration_minutes: policy.lockoutDurationMinutes,

    session_idle_timeout_minutes: policy.sessionIdleTimeoutMinutes,
    session_max_duration_hours: policy.sessionMaxDurationHours,
    max_concurrent_sessions: policy.maxConcurrentSessions,

    login_hours_enabled: policy.loginHoursEnabled,
    login_hours_start_minute: policy.loginHoursStartMinute,
    login_hours_end_minute: policy.loginHoursEndMinute,

    ip_allowlist: policy.ipAllowlist,
  }
}

export async function getSecurityPolicy(): Promise<SecurityPolicyResult> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: SecurityPolicyApiResponse
    }>('/api/v1/security-policy')

    return { success: true, policy: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}

/**
 * Saves the whole policy. It is a PUT rather than a PATCH on purpose: the form submits
 * every field, so an unchecked rule is distinguishable from one that was not sent.
 */
export async function updateSecurityPolicy(
  policy: SecurityPolicy,
): Promise<SecurityPolicyResult> {
  try {
    const { data: body } = await apiClient.put<{
      ok: true
      data: SecurityPolicyApiResponse
    }>('/api/v1/security-policy', mapToApi(policy))

    return { success: true, policy: mapFromApi(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error) }
  }
}
