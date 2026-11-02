import { BookOpenText, CircleAlert, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/shared/ui'

export function DomainState({
  kind,
  title,
  message,
  children,
}: {
  kind: 'loading' | 'empty' | 'error'
  title: string
  message?: string
  children?: ReactNode
}) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? CircleAlert : BookOpenText
  return (
    <Card
      aria-busy={kind === 'loading' || undefined}
      className="grid min-h-36 place-items-center p-6 text-center"
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <div className="grid justify-items-center gap-2">
        <Icon
          aria-hidden="true"
          className={`size-6 text-action-primary ${kind === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        />
        <p className="font-semibold text-ink-primary">{title}</p>
        {message && <p className="max-w-lg text-sm leading-6 text-ink-secondary">{message}</p>}
        {children}
      </div>
    </Card>
  )
}

export function safeMediaHref(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol !== 'https:' && url.origin !== window.location.origin) return undefined
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.href
  } catch {
    return undefined
  }
}
