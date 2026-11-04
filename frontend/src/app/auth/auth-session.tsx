import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { apiAuth, type AppSession } from '@/lib/auth/api-auth'
import { subscribeSessionRevoked } from '@/data/student-demo/session-events'
import type { SessionEndReason } from '@/data/student-demo/session-events'
import { useNotifications } from '@/shared/ui/notifications'

export type AuthSessionStatus = 'checking' | 'anonymous' | 'authenticated' | 'error'

interface AuthSessionContextValue {
  status: AuthSessionStatus
  session: AppSession | null
  sessionEndReason: SessionEndReason | null
  acceptSession: (session: AppSession) => void
  refreshSession: () => Promise<AppSession | null>
  logout: (reason?: SessionEndReason) => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

function clearAccountQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries({
    predicate: (query) => ['student', 'admin', 'auth'].includes(String(query.queryKey[0])),
  })
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const { warning } = useNotifications()
  const [status, setStatus] = useState<AuthSessionStatus>('checking')
  const [session, setSession] = useState<AppSession | null>(null)
  const [sessionEndReason, setSessionEndReason] = useState<SessionEndReason | null>(null)

  const refreshSession = useCallback(async () => {
    setStatus('checking')
    try {
      const restored = await apiAuth.restoreSession()
      setSession(restored)
      setStatus(restored ? 'authenticated' : 'anonymous')
      setSessionEndReason(null)
      return restored
    } catch (error) {
      setSession(null)
      setStatus('error')
      if (error instanceof ApiError && error.code === 'SESSION_REVOKED') {
        setSessionEndReason('revoked')
      }
      throw error
    }
  }, [])

  const acceptSession = useCallback(
    (nextSession: AppSession) => {
      if (session?.id !== nextSession.id || session.role !== nextSession.role)
        clearAccountQueries(queryClient)
      setSession(nextSession)
      setStatus('authenticated')
      setSessionEndReason(null)
    },
    [queryClient, session],
  )

  const logout = useCallback(
    async (reason?: SessionEndReason) => {
      try {
        await apiAuth.logout()
      } catch {
        apiAuth.clearLocalSession()
      } finally {
        clearAccountQueries(queryClient)
        setSession(null)
        setStatus('anonymous')
        setSessionEndReason(reason ?? null)
      }
    },
    [queryClient],
  )

  useEffect(() => {
    let active = true
    void apiAuth
      .restoreSession()
      .then((restored) => {
        if (!active) return
        setSession(restored)
        setStatus(restored ? 'authenticated' : 'anonymous')
      })
      .catch((error: unknown) => {
        if (!active) return
        setSession(null)
        setStatus('error')
        if (error instanceof ApiError && error.code === 'SESSION_REVOKED')
          setSessionEndReason('revoked')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () =>
      subscribeSessionRevoked((reason) => {
        apiAuth.clearLocalSession()
        clearAccountQueries(queryClient)
        setSession(null)
        setStatus('anonymous')
        setSessionEndReason(reason)
        warning(
          reason === 'revoked'
            ? 'Phiên đăng nhập đã bị thay thế hoặc thu hồi'
            : 'Phiên đăng nhập không còn hợp lệ',
          'Dữ liệu riêng đã được xóa khỏi bộ nhớ truy vấn. Hãy đăng nhập lại để tiếp tục.',
        )
      }),
    [queryClient, warning],
  )

  const value = useMemo(
    () => ({ status, session, sessionEndReason, acceptSession, refreshSession, logout }),
    [status, session, sessionEndReason, acceptSession, refreshSession, logout],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext)
  if (!value) throw new Error('useAuthSession must be used within AuthSessionProvider.')
  return value
}
