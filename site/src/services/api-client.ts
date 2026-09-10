import axios, { isAxiosError, type AxiosError } from 'axios'
import { SESSION_ENDED_EVENT, SESSION_KEY, TOKEN_KEY } from '../constants/session'
import type { BackendError } from '../types/auth'
import type { ApiResponse } from '../types/portal-roles'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError<BackendError>(error) && isRevokedSession(error)) {
      // The token is dead server-side — `SessionGuard` dropped it — so keeping it
      // would only make every later request fail the same way. Clear it here and
      // let the auth store bounce the tab to the login page.
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(
        new CustomEvent(SESSION_ENDED_EVENT, {
          detail: { message: error.response?.data?.message },
        }),
      )
    }
    return Promise.reject(error)
  },
)

/**
 * A 401 on a request that carried a bearer token. A 401 from the login endpoint is a
 * wrong password, not a lost session, and is left to the form to report.
 */
function isRevokedSession(error: AxiosError<BackendError>): boolean {
  if (error.response?.status !== 401) return false
  const sentToken = Boolean(error.config?.headers?.Authorization)
  const isLogin = (error.config?.url ?? '').includes('/auth/admin/login')
  return sentToken && !isLogin
}

export function parseApiError(error: unknown): string {
  if (isAxiosError<BackendError>(error)) {
    return error.response?.data?.message ?? error.message ?? 'Request failed'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

export function toApiResponse<T>(
  data: T | undefined,
  message?: string,
): ApiResponse<T> {
  if (data === undefined) {
    return { success: false, message: message ?? 'No data returned', data: null }
  }
  return { success: true, data, message }
}
