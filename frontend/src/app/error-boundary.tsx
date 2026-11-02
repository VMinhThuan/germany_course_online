import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/shared/ui/primitives'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Lỗi hiển thị ứng dụng:', error, info.componentStack)
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-5 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-warning-surface text-warning-foreground">
            <AlertTriangle aria-hidden="true" size={26} />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Giao diện gặp sự cố</h1>
            <p className="max-w-lg text-ink-secondary">
              Tải lại trang để tiếp tục. Nếu lỗi vẫn còn, hãy thử mở lại showcase.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            startIcon={<RotateCw aria-hidden="true" />}
          >
            Tải lại trang
          </Button>
        </main>
      )
    }

    return this.props.children
  }
}
