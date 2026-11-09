import { useEffect } from 'react'
import { BrowserRouter, useLocation, useRoutes, type RouteObject } from 'react-router'
import { AppErrorBoundary } from '@/app/error-boundary'
import { AppProviders } from '@/app/providers'
import { LayoutPreviewPage } from '@/app/layout-preview'
import { UiKitPage } from '@/app/ui-kit'
import { LmsKitPage } from '@/app/lms-kit'
import { productRoutes, ProductRouteEffects, publicNotFoundRoute } from '@/app/public-site/routes'
import { StudentDemoDevControls } from '@/app/dev/student-demo-controls'

function DevRoutes() {
  const location = useLocation()
  useEffect(() => {
    document.body.classList.toggle('app-theme-pink', location.pathname !== '/')
    return () => document.body.classList.remove('app-theme-pink')
  }, [location.pathname])
  const devRoutes: RouteObject[] = [
    { path: '/__dev/ui-kit', element: <UiKitPage /> },
    { path: '/__dev/lms-kit', element: <LmsKitPage /> },
    { path: '/__dev/layouts/:layout', element: <LayoutPreviewPage /> },
  ]
  const routes = useRoutes([...productRoutes.slice(0, -1), ...devRoutes, publicNotFoundRoute])
  return (
    <>
      <ProductRouteEffects />
      {routes}
      <StudentDemoDevControls />
    </>
  )
}

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <DevRoutes />
        </BrowserRouter>
      </AppProviders>
    </AppErrorBoundary>
  )
}
