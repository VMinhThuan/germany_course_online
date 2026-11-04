import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionProvider, useAuthSession } from './auth-session'
import { ProtectedStudentRoute } from './routes'
import { publishSessionRevoked } from '@/data/student-demo/session-events'
import { NotificationProvider } from '@/shared/ui/notifications'

const { authMock } = vi.hoisted(() => ({
  authMock: {
    restoreSession: vi.fn(),
    logout: vi.fn(),
    clearLocalSession: vi.fn(),
  },
}))

vi.mock('@/lib/auth/api-auth', () => ({ apiAuth: authMock }))

const session = {
  id: 'student-1',
  userId: 'student-1',
  role: 'STUDENT' as const,
  profile: {
    id: 'student-1',
    displayName: 'Học viên kiểm thử',
    email: 'student@example.test',
    status: 'ACTIVE' as const,
    phone: null,
    avatarUrl: null,
  },
}

function SessionControls() {
  const { status, session: activeSession, logout } = useAuthSession()
  return (
    <>
      <p data-testid="session-state">
        {status} {activeSession?.profile.displayName}
      </p>
      <button onClick={() => void logout()}>Log out</button>
    </>
  )
}

function CurrentLocation() {
  const location = useLocation()
  return <p data-testid="current-location">{location.pathname + location.search}</p>
}

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderSession(client: QueryClient, children: React.ReactNode) {
  return render(
    <QueryClientProvider client={client}>
      <NotificationProvider>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

describe('API auth session boundary', () => {
  beforeEach(() => {
    authMock.restoreSession.mockReset().mockResolvedValue(null)
    authMock.logout.mockReset().mockResolvedValue(undefined)
    authMock.clearLocalSession.mockReset()
  })

  it('restores the API session, then logs out and removes protected query data', async () => {
    authMock.restoreSession.mockResolvedValueOnce(session)
    const client = createClient()
    const key = ['student', 'dashboard', session.id]
    client.setQueryData(key, { private: 'student data' })

    renderSession(client, <SessionControls />)
    await waitFor(() =>
      expect(screen.getByTestId('session-state')).toHaveTextContent('authenticated'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(screen.getByTestId('session-state')).toHaveTextContent('anonymous'))
    expect(client.getQueryData(key)).toBeUndefined()
    expect(authMock.logout).toHaveBeenCalledOnce()
  })

  it('clears session and student cache after a SESSION_REVOKED event', async () => {
    authMock.restoreSession.mockResolvedValueOnce(session)
    const client = createClient()
    const key = ['student', 'dashboard', session.id]
    client.setQueryData(key, { private: 'student data' })

    renderSession(client, <SessionControls />)
    await waitFor(() =>
      expect(screen.getByTestId('session-state')).toHaveTextContent('authenticated'),
    )
    act(() => publishSessionRevoked('revoked'))

    await waitFor(() => expect(screen.getByTestId('session-state')).toHaveTextContent('anonymous'))
    expect(client.getQueryData(key)).toBeUndefined()
    expect(authMock.clearLocalSession).toHaveBeenCalledOnce()
    expect(screen.getByText('Phiên đăng nhập đã bị thay thế hoặc thu hồi')).toBeInTheDocument()
  })

  it('redirects an anonymous guest deep link to login with an internal return path', async () => {
    const client = createClient()
    renderSession(
      client,
      <MemoryRouter initialEntries={['/student/courses?sort=recent']}>
        <Routes>
          <Route
            path="/login"
            element={
              <>
                <p>Login screen</p>
                <CurrentLocation />
              </>
            }
          />
          <Route element={<ProtectedStudentRoute />}>
            <Route path="/student/courses" element={<p>Private courses</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login screen')).toBeInTheDocument()
    expect(screen.getByTestId('current-location')).toHaveTextContent(
      '/login?returnTo=%2Fstudent%2Fcourses%3Fsort%3Drecent',
    )
    expect(screen.queryByText('Private courses')).not.toBeInTheDocument()
  })
})
