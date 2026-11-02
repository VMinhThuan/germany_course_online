import { Navigate, Outlet, useLocation } from 'react-router'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages'
import { StudentCoursesPage, StudentDashboardPage } from '@/app/student/pages'
import { useAuthSession } from './auth-session'
import { sanitizeReturnTo } from './redirects'
import { AuthChecking } from './shared'

export function ProtectedStudentRoute() {
  const { status, session, sessionEndReason } = useAuthSession()
  const location = useLocation()

  if (status === 'checking') return <AuthChecking />
  if (!session) {
    const returnTo = sanitizeReturnTo(`${location.pathname}${location.search}${location.hash}`)
    const revoked =
      sessionEndReason === 'revoked' ||
      new URLSearchParams(location.search).get('sessionRevoked') === '1'
    const invalid = sessionEndReason === 'invalid'
    return (
      <Navigate
        replace
        to={`/login?returnTo=${encodeURIComponent(returnTo)}${revoked ? '&sessionRevoked=1' : invalid ? '&sessionInvalid=1' : ''}`}
      />
    )
  }
  return <Outlet />
}

export const authRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
]

export const studentRoutes = [
  {
    element: <ProtectedStudentRoute />,
    children: [
      { path: '/student', element: <StudentDashboardPage /> },
      { path: '/student/courses', element: <StudentCoursesPage /> },
    ],
  },
]
