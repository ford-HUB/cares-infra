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
  /** Effective rights — baseline + grants − revokes − active suspensions. */
  permissions: string[]
  suspensions: SessionSuspensionApi[]
  access_token: string
}

/** One active suspension on the session, as the server sends it. */
export interface SessionSuspensionApi {
  permission: string
  reason: string
  issued_at: string
  expires_at: string | null
}

export interface MeApiResponse {
  user_id: string
  email: string
  firstname: string
  lastname: string
  role_type: string
  is_protected: boolean
  permissions: string[]
  suspensions: SessionSuspensionApi[]
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
