import { apiRequest, clearAccessToken, restoreAccessToken, setAccessToken } from '@/lib/api/client'
import type { ApiAuthResult, ApiUserProfile } from '@/lib/api/types'

export interface AppSession {
  id: string
  userId: string
  role: ApiUserProfile['role']
  profile: {
    id: string
    displayName: string
    email: string
    status: ApiUserProfile['status']
    phone: string | null
    avatarUrl: string | null
  }
}

function toAppSession(user: ApiUserProfile): AppSession {
  return {
    id: user.id,
    userId: user.id,
    role: user.role,
    profile: {
      id: user.id,
      displayName: user.fullName,
      email: user.email,
      status: user.status,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
  }
}

function acceptAuthResult(result: ApiAuthResult) {
  setAccessToken(result.accessToken)
  return toAppSession(result.user)
}

export const apiAuth = {
  async login(email: string, password: string) {
    const result = await apiRequest<ApiAuthResult>('/auth/login', {
      method: 'POST',
      auth: false,
      credentials: 'include',
      headers: { 'X-Device-Name': navigator.userAgent.slice(0, 120) },
      body: { email: email.trim(), password },
    })
    return acceptAuthResult(result)
  },

  async restoreSession(): Promise<AppSession | null> {
    const token = await restoreAccessToken()
    if (!token) return null
    const profile = await apiRequest<ApiUserProfile>('/auth/me')
    return toAppSession(profile)
  },

  async register(input: { fullName: string; email: string; password: string }) {
    await apiRequest<ApiUserProfile>('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        password: input.password,
      },
    })
  },

  async requestPasswordReset(email: string) {
    return apiRequest<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      auth: false,
      body: { email: email.trim() },
    })
  },

  async resetPassword(token: string, password: string) {
    await apiRequest<Record<string, never>>('/auth/password/reset', {
      method: 'POST',
      auth: false,
      body: { token, password },
    })
  },

  async logout() {
    try {
      await apiRequest<Record<string, never>>('/auth/logout', {
        method: 'POST',
        credentials: 'include',
        csrfProtection: true,
      })
    } finally {
      clearAccessToken()
    }
  },

  clearLocalSession() {
    clearAccessToken()
  },
}
