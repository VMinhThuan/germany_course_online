import { BrowserRouter } from 'react-router'
import { AppErrorBoundary } from '@/app/error-boundary'
import { AppProviders } from '@/app/providers'
import { ProductRoutes } from '@/app/public-site/routes'

export function ProductionApp() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <ProductRoutes />
        </BrowserRouter>
      </AppProviders>
    </AppErrorBoundary>
  )
}
