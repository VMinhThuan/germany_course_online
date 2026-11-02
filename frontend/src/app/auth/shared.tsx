import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { LoadingSpinner } from '@/shared/ui'

export function AuthChecking() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4" aria-live="polite">
      <LoadingSpinner label="Đang kiểm tra phiên demo" />
    </main>
  )
}

export function InlineProductLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-action-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
