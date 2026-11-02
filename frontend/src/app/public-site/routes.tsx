import { useLayoutEffect, useEffect, useRef } from 'react'
import { useLocation, useNavigationType, useRoutes, type RouteObject } from 'react-router'
import {
  CourseCatalogPage,
  CourseDetailPage,
  FreePreviewPage,
  PublicLandingPage,
  PublicNotFoundPage,
} from './pages'
import { authRoutes, studentRoutes } from '@/app/auth/routes'

export const publicSiteRoutes: RouteObject[] = [
  { path: '/', element: <PublicLandingPage /> },
  { path: '/courses', element: <CourseCatalogPage /> },
  { path: '/courses/:slug', element: <CourseDetailPage /> },
  { path: '/courses/:slug/preview', element: <FreePreviewPage /> },
]

export const publicNotFoundRoute: RouteObject = { path: '*', element: <PublicNotFoundPage /> }
export const productRoutes: RouteObject[] = [
  ...publicSiteRoutes,
  ...authRoutes,
  ...studentRoutes,
  publicNotFoundRoute,
]

export function ProductRouteEffects() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map<string, { x: number; y: number }>())
  const firstRender = useRef(true)

  useEffect(() => {
    const savePosition = () => {
      positions.current.set(location.key, { x: window.scrollX, y: window.scrollY })
    }
    window.addEventListener('scroll', savePosition, { passive: true })
    return () => {
      savePosition()
      window.removeEventListener('scroll', savePosition)
    }
  }, [location.key])

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    if (location.hash) {
      requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
      })
      return
    }

    if (navigationType === 'POP') {
      const saved = positions.current.get(location.key)
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(saved.x, saved.y))
      }
      return
    }

    window.scrollTo(0, 0)
  }, [location.hash, location.key, location.pathname, navigationType])

  return null
}

export function ProductRoutes() {
  const routes = useRoutes(productRoutes)
  return (
    <>
      <ProductRouteEffects />
      {routes}
    </>
  )
}
