import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clientMock } = vi.hoisted(() => ({
  clientMock: {
    apiRequest: vi.fn(),
    clearAccessToken: vi.fn(),
    restoreAuthResult: vi.fn(),
    setAccessToken: vi.fn(),
  },
}))

vi.mock('@/lib/api/client', () => clientMock)

import { apiAuth } from './api-auth'

const profile = {
  id: 'student-1',
  fullName: 'Học viên kiểm thử',
  email: 'student@example.test',
  phone: null,
  avatarUrl: null,
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
}

describe('apiAuth session restoration', () => {
  beforeEach(() => {
    clientMock.apiRequest.mockReset()
    clientMock.clearAccessToken.mockReset()
    clientMock.restoreAuthResult.mockReset()
    clientMock.setAccessToken.mockReset()
  })

  it('shares one refresh and profile request when restore starts concurrently', async () => {
    clientMock.restoreAuthResult.mockResolvedValue({
      accessToken: 'access-token',
      expiresIn: 900,
      user: profile,
    })

    const [first, second] = await Promise.all([apiAuth.restoreSession(), apiAuth.restoreSession()])

    expect(first).toEqual(second)
    expect(first?.profile.email).toBe(profile.email)
    expect(clientMock.restoreAuthResult).toHaveBeenCalledOnce()
    expect(clientMock.apiRequest).not.toHaveBeenCalled()
  })
})
