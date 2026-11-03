import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { brandConfig, formatDocumentTitle } from '@/config/brand'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử root của ứng dụng.')
}

const application = import.meta.env.DEV
  ? import('@/app/App').then(({ App }) => App)
  : import('@/app/ProductionApp').then(({ ProductionApp }) => ProductionApp)

void application.then((RootApp) => {
  document.title = formatDocumentTitle(brandConfig.courseName)
  createRoot(rootElement).render(
    <StrictMode>
      <RootApp />
    </StrictMode>,
  )
})
