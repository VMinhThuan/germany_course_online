import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import {
  ApiForgotPasswordPage,
  ApiLoginPage,
  ApiRegisterPage,
  ApiResetPasswordPage,
} from './api-pages'
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

const AdminDashboardPage = lazy(async () => {
  const pages = await import('@/app/admin/pages')
  return { default: pages.AdminDashboardPage }
})
const AdminWorkspacePage = lazy(async () => {
  const pages = await import('@/app/admin/pages')
  return { default: pages.AdminWorkspacePage }
})

function AdminRouteLoading() {
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-xl place-items-center px-5 py-12">
      <p role="status" className="text-sm text-ink-secondary">
        Đang tải khu vực quản trị…
      </p>
    </main>
  )
}

export function ProtectedStudentRoute() {
  const { status, session, sessionEndReason, refreshSession } = useAuthSession()
  const location = useLocation()

  if (status === 'checking') return <AuthChecking />
  if (status === 'error') {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-xl content-center gap-4 px-5 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Chưa xác minh được phiên đăng nhập</h1>
        <p className="text-ink-secondary">
          Không thể kết nối với API để khôi phục phiên. Thử lại trước khi đăng nhập lại.
        </p>
        <button
          className="mx-auto min-h-11 rounded-xl bg-action-primary px-5 font-semibold text-white"
          onClick={() => void refreshSession().catch(() => undefined)}
        >
          Thử kết nối lại
        </button>
      </main>
    )
  }
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
  if (session.role === 'ADMIN') return <Navigate replace to="/admin" />
  return <Outlet />
}

export function ProtectedAdminRoute() {
  const { status, session, sessionEndReason, refreshSession } = useAuthSession()
  const location = useLocation()
  if (status === 'checking') return <AuthChecking />
  if (status === 'error') {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-xl content-center gap-4 px-5 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Chưa xác minh được quyền quản trị</h1>
        <p className="text-ink-secondary">
          Kết nối API đang lỗi. Hãy thử khôi phục phiên trước khi tiếp tục.
        </p>
        <button
          className="mx-auto min-h-11 rounded-xl bg-action-primary px-5 font-semibold text-white"
          onClick={() => void refreshSession().catch(() => undefined)}
        >
          Thử kết nối lại
        </button>
      </main>
    )
  }
  if (!session) {
    const returnTo = sanitizeReturnTo(`${location.pathname}${location.search}${location.hash}`)
    const revoked = sessionEndReason === 'revoked'
    return (
      <Navigate
        replace
        to={`/login?returnTo=${encodeURIComponent(returnTo)}${revoked ? '&sessionRevoked=1' : ''}`}
      />
    )
  }
  if (session.role !== 'ADMIN') return <Navigate replace to="/student" />
  return <Outlet />
}

export const authRoutes = [
  { path: '/login', element: <ApiLoginPage /> },
  { path: '/register', element: <ApiRegisterPage /> },
  { path: '/forgot-password', element: <ApiForgotPasswordPage /> },
  { path: '/reset-password', element: <ApiResetPasswordPage /> },
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
  {
    element: <ProtectedAdminRoute />,
    children: [
      {
        path: '/admin',
        element: (
          <Suspense fallback={<AdminRouteLoading />}>
            <AdminDashboardPage />
          </Suspense>
        ),
      },
      {
        path: '/admin/*',
        element: (
          <Suspense fallback={<AdminRouteLoading />}>
            <AdminWorkspacePage />
          </Suspense>
        ),
      },
    ],
  },
]
