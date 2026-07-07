export interface LoginPayload {
  email: string
  password: string
}

export interface AdminLoginApiResponse {
  user_id: string
  role_type: string
  email: string
  firstname: string
  lastname: string
  has_interests: boolean
  access_token: string
}

export interface MeApiResponse {
  user_id: string
  email: string
  firstname: string
  lastname: string
  role_type: string
}

export interface BackendSuccess<T> {
  ok: true
  message?: string
  data: T
}

export interface BackendError {
  ok: false
  message: string
  errors?: unknown
}
