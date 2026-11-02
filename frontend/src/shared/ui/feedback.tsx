import { AlertCircle, CheckCircle2, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button, Card, CardContent } from './primitives'
import { cn } from './cn'

export type FeedbackTone = 'success' | 'warning' | 'danger' | 'info'

const toneStyles: Record<FeedbackTone, { shell: string; icon: string }> = {
  success: {
    shell: 'border-success-foreground/20 bg-success-surface text-success-foreground',
    icon: 'text-success-foreground',
  },
  warning: {
    shell: 'border-warning-foreground/20 bg-warning-surface text-warning-foreground',
    icon: 'text-warning-foreground',
  },
  danger: {
    shell: 'border-danger-foreground/20 bg-danger-surface text-danger-foreground',
    icon: 'text-danger-foreground',
  },
  info: {
    shell: 'border-info-foreground/20 bg-info-surface text-info-foreground',
    icon: 'text-info-foreground',
  },
}

const toneIcons = {
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
  info: Info,
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: FeedbackTone
  title?: string
  children: ReactNode
  action?: ReactNode
  className?: string
  role?: 'alert' | 'status'
}) {
  const Icon = toneIcons[tone]
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        toneStyles[tone].shell,
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', toneStyles[tone].icon)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-sm leading-6">{children}</div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  )
}

export function ErrorMessage({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="text-sm font-medium text-danger-foreground">
      {children}
    </p>
  )
}

export function StatusBadge({
  status,
  label,
}: {
  status: FeedbackTone | 'preview' | 'neutral'
  label: string
}) {
  const tones = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info',
    preview: 'preview',
    neutral: 'neutral',
  } as const
  return <Badge tone={tones[status]}>{label}</Badge>
}

export function LoadingSpinner({
  label = 'Đang tải',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 text-sm text-ink-secondary', className)}
    >
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      <span>{label}</span>
    </span>
  )
}

export function Skeleton({
  className,
  rounded = 'md',
}: {
  className?: string
  rounded?: 'sm' | 'md' | 'full'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse bg-surface-muted motion-reduce:animate-none',
        rounded === 'full' ? 'rounded-full' : rounded === 'sm' ? 'rounded-md' : 'rounded-xl',
        className,
      )}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="border-dashed bg-card-surface/80">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {icon && (
          <span className="grid size-12 place-items-center rounded-2xl bg-surface-blue text-pastel-blue-ink">
            {icon}
          </span>
        )}
        <div className="max-w-md space-y-1.5">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="text-sm leading-6 text-ink-secondary">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

export function ErrorState({
  title = 'Không thể tải nội dung',
  description = 'Kiểm tra kết nối rồi thử lại.',
  onRetry,
  action,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  action?: ReactNode
}) {
  return (
    <InlineAlert
      tone="danger"
      title={title}
      action={
        action ??
        (onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        ) : undefined)
      }
    >
      {description}
    </InlineAlert>
  )
}
