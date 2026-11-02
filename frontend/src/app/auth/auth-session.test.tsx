import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthSessionProvider, useAuthSession } from './auth-session'
import { ProtectedStudentRoute } from './routes'
import { studentDemoRepositories } from '@/data/student-demo/repository'
import { publishSessionRevoked } from '@/data/student-demo/session-events'
import { NotificationProvider } from '@/shared/ui/notifications'

function SessionControls() {
  const { status, session, logout } = useAuthSession()
  return (
    <>
      <p data-testid="session-state">
        {status} {session?.profile.displayName}
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

describe('demo auth session boundary', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    studentDemoRepositories.auth.clearSession()
  })

  it('logs out and removes protected student query data', async () => {
    const session = await studentDemoRepositories.auth.signInWithDemoAccount('active-student')
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
    expect(window.sessionStorage.getItem('deutsch-a11.demo-session-user')).toBeNull()
  })

  it('clears session and student cache after the revoked-session event', async () => {
    const session = await studentDemoRepositories.auth.signInWithDemoAccount('active-student')
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
    expect(window.sessionStorage.getItem('deutsch-a11.demo-session-user')).toBeNull()
    expect(screen.getByText('Phiên demo đã bị thu hồi')).toBeInTheDocument()
  })

  it('redirects a guest deep link to login with an internal return path', async () => {
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
