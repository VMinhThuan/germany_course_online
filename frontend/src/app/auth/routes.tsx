import { Navigate, Outlet, useLocation } from 'react-router'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages'
import { StudentCoursesPage, StudentDashboardPage } from '@/app/student/pages'
import {
  LearningCoursePage,
  LearningExercisePage,
  LearningLessonPage,
  LearningQuizPage,
  LearningQuizResultPage,
  LearningSectionPage,
  StudentProgressPage,
} from '@/app/student-lms/learning-pages'
import {
  CheckoutPage,
  CourseRenewalPage,
  OrderPendingPage,
  OrderResultPage,
  StudentOrderDetailPage,
  StudentOrdersPage,
} from '@/app/student-lms/commerce-pages'
import {
  StudentPasswordPage,
  StudentProfilePage,
  StudentSessionsPage,
} from '@/app/student-lms/account-pages'
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
      { path: '/student/progress', element: <StudentProgressPage /> },
      { path: '/student/orders', element: <StudentOrdersPage /> },
      { path: '/student/orders/:id', element: <StudentOrderDetailPage /> },
      { path: '/student/courses/:courseId/renew', element: <CourseRenewalPage /> },
      { path: '/student/profile', element: <StudentProfilePage /> },
      { path: '/student/security/password', element: <StudentPasswordPage /> },
      { path: '/student/security/sessions', element: <StudentSessionsPage /> },
      { path: '/learn/courses/:courseId', element: <LearningCoursePage /> },
      { path: '/learn/courses/:courseId/sections/:sectionId', element: <LearningSectionPage /> },
      { path: '/learn/lessons/:lessonId', element: <LearningLessonPage /> },
      { path: '/learn/exercises/:exerciseId', element: <LearningExercisePage /> },
      { path: '/learn/quizzes/:attemptId', element: <LearningQuizPage /> },
      { path: '/learn/quizzes/:attemptId/result', element: <LearningQuizResultPage /> },
      { path: '/checkout/:orderContext', element: <CheckoutPage /> },
      { path: '/orders/:id/pending', element: <OrderPendingPage /> },
      { path: '/orders/:id/result', element: <OrderResultPage /> },
    ],
  },
]
