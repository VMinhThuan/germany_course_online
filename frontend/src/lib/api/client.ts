import { publishSessionRevoked } from '@/data/student-demo/session-events'

export const API_BASE_URL = (import.meta.env['VITE_API_BASE_URL']?.trim() || '/api/v1').replace(
  /\/$/,
  '',
)

export interface ApiErrorDetail {
  path?: string[]
  field?: string
  message?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly requestId: string | undefined

  constructor(input: {
    message: string
    status: number
    code: string
    details?: ApiErrorDetail[]
    requestId?: string
  }) {
    super(input.message)
    this.name = 'ApiError'
    this.status = input.status
    this.code = input.code
    this.details = input.details ?? []
    this.requestId = input.requestId
  }

  get fieldErrors() {
    return Object.fromEntries(
      this.details.flatMap((detail) => {
        const name = detail.field ?? detail.path?.at(-1)
        return name && detail.message ? [[name, detail.message]] : []
      }),
    )
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'credentials'> {
  body?: unknown
  auth?: boolean
  credentials?: RequestCredentials
  csrfProtection?: boolean
  idempotencyKey?: string
  timeoutMs?: number
}

interface ApiEnvelope<T> {
  success: true
  data: T
  requestId?: string
}

interface ApiErrorEnvelope {
  success: false
  error?: { code?: string; message?: string; details?: ApiErrorDetail[] }
  requestId?: string
}

let accessToken: string | null = null
let refreshFlight: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export function hasAccessToken() {
  return accessToken !== null
}

function apiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
}

function toApiError(response: Response, payload: unknown): ApiError {
  const envelope = payload as ApiErrorEnvelope | null
  const error = envelope && typeof envelope === 'object' ? envelope.error : undefined
  return new ApiError({
    status: response.status,
    code: error?.code ?? 'API_ERROR',
    message: error?.message ?? `Yêu cầu thất bại (${response.status}).`,
    details: Array.isArray(error?.details) ? error.details : [],
    ...(envelope?.requestId ? { requestId: envelope.requestId } : {}),
  })
}

async function perform<T>(path: string, options: ApiRequestOptions, token: string | null) {
  const {
    auth: _auth,
    csrfProtection,
    idempotencyKey,
    timeoutMs: _timeoutMs,
    body: requestBody,
    credentials,
    headers: requestHeaders,
    signal: callerSignal,
    ...requestInit
  } = options
  void _auth
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    _timeoutMs ?? 15_000,
  )
  const abortFromCaller = () => controller.abort(callerSignal?.reason)
  if (callerSignal?.aborted) abortFromCaller()
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })

  const headers = new Headers(requestHeaders)
  headers.set('Accept', 'application/json')
  if (requestBody !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (csrfProtection) headers.set('X-CSRF-Protection', '1')
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

  try {
    const response = await fetch(apiUrl(path), {
      ...requestInit,
      headers,
      ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
      credentials: credentials ?? 'omit',
      signal: controller.signal,
    })
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw toApiError(response, payload)
    if (response.status === 204) return undefined as T
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('success' in payload) ||
      !('data' in payload)
    ) {
      throw new ApiError({
        status: response.status,
        code: 'INVALID_API_RESPONSE',
        message: 'Backend trả về dữ liệu không đúng hợp đồng.',
      })
    }
    return (payload as ApiEnvelope<T>).data
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    if (controller.signal.aborted) {
      const timedOut = !callerSignal?.aborted
      throw new ApiError({
        status: 0,
        code: timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_ABORTED',
        message: timedOut ? 'Máy chủ phản hồi quá lâu. Hãy thử lại.' : 'Yêu cầu đã bị hủy.',
      })
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không kết nối được máy chủ. Kiểm tra mạng hoặc cấu hình API rồi thử lại.',
    })
  } finally {
    clearTimeout(timeout)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }
}

async function refreshAccessToken() {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      try {
        const result = await perform<{ accessToken: string }>(
          '/auth/refresh',
          {
            method: 'POST',
            auth: false,
            credentials: 'include',
            csrfProtection: true,
            timeoutMs: 12_000,
          },
          null,
        )
        accessToken = result.accessToken
        return accessToken
      } catch (cause) {
        accessToken = null
        if (cause instanceof ApiError && cause.code === 'SESSION_REVOKED') {
          publishSessionRevoked('revoked')
        }
        throw cause
      } finally {
        refreshFlight = null
      }
    })()
  }
  return refreshFlight
}

export async function restoreAccessToken() {
  try {
    return await refreshAccessToken()
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401 && cause.code !== 'SESSION_REVOKED')
      return null
    throw cause
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const authenticated = options.auth !== false
  const token = authenticated ? accessToken : null
  try {
    return await perform<T>(path, options, token)
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.status !== 401 || !authenticated) throw cause
    if (cause.code === 'SESSION_REVOKED') {
      clearAccessToken()
      publishSessionRevoked('revoked')
      throw cause
    }

    const latestToken =
      accessToken !== token
        ? accessToken
        : await refreshAccessToken().catch((refreshError: unknown) => {
            if (refreshError instanceof ApiError && refreshError.code === 'SESSION_REVOKED')
              throw refreshError
            throw refreshError
          })
    if (!latestToken) throw cause
    return perform<T>(path, options, latestToken)
  }
}

export async function uploadWithProgress(
  instruction: {
    url: string
    method: 'PUT' | 'POST'
    headers?: Record<string, string>
    fields?: Record<string, string>
  },
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const abort = () => request.abort()
    request.open(instruction.method, instruction.url)
    for (const [name, value] of Object.entries(instruction.headers ?? {}))
      request.setRequestHeader(name, value)
    const body = new FormData()
    if (instruction.method === 'POST') {
      for (const [name, value] of Object.entries(instruction.fields ?? {})) body.append(name, value)
      body.append('file', file, file.name)
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      cleanup()
      if (request.status >= 200 && request.status < 300) resolve()
      else
        reject(
          new ApiError({
            status: request.status,
            code: 'MEDIA_UPLOAD_FAILED',
            message: 'Nhà cung cấp tệp không xác nhận được lượt tải lên.',
          }),
        )
    }
    request.onerror = () => {
      cleanup()
      reject(
        new ApiError({
          status: 0,
          code: 'MEDIA_UPLOAD_FAILED',
          message: 'Không thể kết nối nhà cung cấp lưu trữ tệp.',
        }),
      )
    }
    request.onabort = () => {
      cleanup()
      reject(
        new ApiError({ status: 0, code: 'REQUEST_ABORTED', message: 'Lượt tải lên đã bị hủy.' }),
      )
    }
    if (signal?.aborted) {
      reject(
        new ApiError({ status: 0, code: 'REQUEST_ABORTED', message: 'Lượt tải lên đã bị hủy.' }),
      )
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    request.send(instruction.method === 'PUT' ? file : body)
  })
}
