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
import { studentDemoRepositories } from '@/data/student-demo/repository'
import { subscribeSessionRevoked } from '@/data/student-demo/session-events'
import type { SessionEndReason } from '@/data/student-demo/session-events'
import type { DemoSession } from '@/data/student-demo/types'
import { useNotifications } from '@/shared/ui/notifications'

export type AuthSessionStatus = 'checking' | 'anonymous' | 'authenticated'

interface AuthSessionContextValue {
  status: AuthSessionStatus
  session: DemoSession | null
  sessionEndReason: SessionEndReason | null
  acceptSession: (session: DemoSession) => void
  refreshSession: () => Promise<DemoSession | null>
  logout: () => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const { warning } = useNotifications()
  const [status, setStatus] = useState<AuthSessionStatus>('checking')
  const [session, setSession] = useState<DemoSession | null>(null)
  const [sessionEndReason, setSessionEndReason] = useState<SessionEndReason | null>(null)

  const refreshSession = useCallback(async () => {
    const restored = await studentDemoRepositories.auth.restoreSession()
    setSession(restored)
    setStatus(restored ? 'authenticated' : 'anonymous')
    setSessionEndReason(null)
    return restored
  }, [])

  const acceptSession = useCallback(
    (nextSession: DemoSession) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'student' })
      setSession(nextSession)
      setStatus('authenticated')
      setSessionEndReason(null)
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    await studentDemoRepositories.auth.logout()
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'student' })
    setSession(null)
    setStatus('anonymous')
    setSessionEndReason(null)
  }, [queryClient])

  useEffect(() => {
    let active = true
    void studentDemoRepositories.auth.restoreSession().then((restored) => {
      if (!active) return
      setSession(restored)
      setStatus(restored ? 'authenticated' : 'anonymous')
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () =>
      subscribeSessionRevoked((reason) => {
        studentDemoRepositories.auth.clearSession()
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'student' })
        setSession(null)
        setStatus('anonymous')
        setSessionEndReason(reason)
        warning(
          reason === 'revoked' ? 'Phiên demo đã bị thu hồi' : 'Phiên demo không còn hợp lệ',
          'Dữ liệu học viên đã được xóa khỏi bộ nhớ truy vấn. Hãy đăng nhập lại để tiếp tục.',
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
