import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiPublicRepository } from '@/data/api/public-repository'
import { API_BASE_URL, clearAccessToken, restoreAccessToken, setAccessToken } from './client'

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

const fetchMock = vi.fn<typeof fetch>()

describe('API client public and refresh boundaries', () => {
  beforeEach(() => {
    clearAccessToken()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('calls the public catalog without a bearer token or cookies', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { items: [], page: 1, pageSize: 12, total: 0, hasMore: false },
      }),
    )
    setAccessToken('synthetic-access-token')

    await expect(apiPublicRepository.listCoursesPage(1, 12)).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(`${API_BASE_URL}/courses?page=1&pageSize=12`)
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
    expect(init?.credentials).toBe('omit')
  })

  it('treats an anonymous Express refresh 401 as an unauthenticated session', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh session is invalid or expired.' },
      }),
    )

    await expect(restoreAccessToken()).resolves.toBeNull()

    const [url, init] = fetchMock.mock.calls[0] ?? []
    const headers = new Headers(init?.headers)
    expect(url).toBe(`${API_BASE_URL}/auth/refresh`)
    expect(init?.credentials).toBe('include')
    expect(headers.get('X-CSRF-Protection')).toBe('1')
    expect(headers.has('Authorization')).toBe(false)
  })
})
