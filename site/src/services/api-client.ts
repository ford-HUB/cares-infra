import axios, { isAxiosError } from 'axios'
import { TOKEN_KEY } from '../constants/session'
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
