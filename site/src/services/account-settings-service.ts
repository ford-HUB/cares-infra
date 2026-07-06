import { TOKEN_KEY } from '../constants/session'
import { apiClient, parseApiError, USE_MOCK_API } from './api-client'
import { persistSession } from './auth-service'
import { useAuthStore } from '../store/auth-store'

export interface ChangeEmailPayload {
  current_password: string
  new_email: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export async function changeAccountEmail(payload: ChangeEmailPayload) {
  if (USE_MOCK_API) {
    const user = useAuthStore.getState().user
    if (user) {
      persistSession({ ...user, email: payload.new_email.toLowerCase() })
      useAuthStore.setState({
        user: { ...user, email: payload.new_email.toLowerCase() },
      })
    }
    return { success: true as const, message: 'Email updated (mock)' }
  }

  try {
    const { data: body } = await apiClient.put<{
      ok: true
      data: { email: string; access_token: string }
    }>('/api/v1/account/email', {
      current_password: payload.current_password,
      new_email: payload.new_email.trim().toLowerCase(),
    })

    const user = useAuthStore.getState().user
    if (user) {
      const updated = { ...user, email: body.data.email }
      persistSession(updated, body.data.access_token)
      useAuthStore.setState({ user: updated })
    } else {
      sessionStorage.setItem(TOKEN_KEY, body.data.access_token)
    }

    return { success: true as const, message: 'Email updated successfully' }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}

export async function changeAccountPassword(payload: ChangePasswordPayload) {
  if (USE_MOCK_API) {
    return { success: true as const, message: 'Password updated (mock)' }
  }

  try {
    await apiClient.put('/api/v1/account/password', {
      current_password: payload.current_password,
      new_password: payload.new_password,
    })
    return { success: true as const, message: 'Password updated successfully' }
  } catch (error) {
    return { success: false as const, message: parseApiError(error) }
  }
}
