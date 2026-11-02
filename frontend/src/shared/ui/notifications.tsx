import { AlertCircle, Check, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './primitives'
import { cn } from './cn'

export type NotificationKind = 'success' | 'error' | 'warning' | 'info'

export type NotificationInput = {
  kind: NotificationKind
  title: string
  description?: string
  duration?: number
  dedupeKey?: string
  action?: { label: string; onSelect: () => void }
}

type NotificationItem = NotificationInput & { id: string }

type NotificationApi = {
  notify: (notification: NotificationInput) => string | undefined
  success: (title: string, description?: string) => string | undefined
  error: (title: string, description?: string) => string | undefined
  warning: (title: string, description?: string) => string | undefined
  info: (title: string, description?: string) => string | undefined
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationApi | null>(null)

const notificationStyle: Record<
  NotificationKind,
  { shell: string; icon: string; Icon: LucideIcon }
> = {
  success: {
    shell: 'border-success-foreground/25 bg-success-surface',
    icon: 'text-success-foreground',
    Icon: CheckCircle2,
  },
  error: {
    shell: 'border-danger-foreground/25 bg-danger-surface',
    icon: 'text-danger-foreground',
    Icon: AlertCircle,
  },
  warning: {
    shell: 'border-warning-foreground/25 bg-warning-surface',
    icon: 'text-warning-foreground',
    Icon: TriangleAlert,
  },
  info: {
    shell: 'border-info-foreground/25 bg-info-surface',
    icon: 'text-info-foreground',
    Icon: Info,
  },
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [paused, setPaused] = useState<Set<string>>(() => new Set())
  const counter = useRef(0)
  const lastShown = useRef(new Map<string, number>())
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
    setPaused((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }, [])

  const notify = useCallback((notification: NotificationInput) => {
    const signature =
      notification.dedupeKey ??
      `${notification.kind}:${notification.title}:${notification.description ?? ''}`
    const now = Date.now()
    const previous = lastShown.current.get(signature)
    if (previous !== undefined && now - previous < 1200) return undefined
    lastShown.current.set(signature, now)

    const id = `notice-${++counter.current}`
    setItems((current) => {
      const next = [...current, { ...notification, id }]
      if (next.length <= 4) return next
      const [oldest, ...rest] = next
      if (oldest) {
        const oldTimer = timers.current.get(oldest.id)
        if (oldTimer !== undefined) window.clearTimeout(oldTimer)
        timers.current.delete(oldest.id)
      }
      return rest
    })
    return id
  }, [])

  const scheduleDismiss = useCallback(
    (item: NotificationItem) => {
      const duration = item.duration ?? 6500
      if (duration <= 0 || paused.has(item.id)) return
      const currentTimer = timers.current.get(item.id)
      if (currentTimer !== undefined) window.clearTimeout(currentTimer)
      timers.current.set(
        item.id,
        window.setTimeout(() => dismiss(item.id), duration),
      )
    },
    [dismiss, paused],
  )

  useEffect(() => {
    const activeTimers = timers.current
    items.forEach(scheduleDismiss)
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer))
  }, [items, scheduleDismiss])

  const api: NotificationApi = {
    notify,
    success: (title, description) =>
      notify({ kind: 'success', title, ...(description ? { description } : {}) }),
    error: (title, description) =>
      notify({ kind: 'error', title, ...(description ? { description } : {}) }),
    warning: (title, description) =>
      notify({ kind: 'warning', title, ...(description ? { description } : {}) }),
    info: (title, description) =>
      notify({ kind: 'info', title, ...(description ? { description } : {}) }),
    dismiss,
  }

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <aside
        aria-label="Thông báo"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-toast flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:bottom-auto sm:w-[min(24rem,calc(100vw-2rem))]"
      >
        {items.map((item) => (
          <NotificationToast key={item.id} item={item} dismiss={dismiss} setPaused={setPaused} />
        ))}
      </aside>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider.')
  return context
}

function NotificationToast({
  item,
  dismiss,
  setPaused,
}: {
  item: NotificationItem
  dismiss: (id: string) => void
  setPaused: Dispatch<SetStateAction<Set<string>>>
}) {
  const { Icon, shell, icon } = notificationStyle[item.kind]
  const addPause = () => setPaused((current) => new Set(current).add(item.id))
  const removePause = () =>
    setPaused((current) => {
      const next = new Set(current)
      next.delete(item.id)
      return next
    })

  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onPointerEnter={addPause}
      onPointerLeave={removePause}
      onFocusCapture={addPause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) removePause()
      }}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-raised motion-safe:animate-toast-in',
        shell,
      )}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', icon)} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold text-ink-primary">{item.title}</p>
        {item.description && (
          <p className="text-sm leading-5 text-ink-secondary">{item.description}</p>
        )}
        {item.action && (
          <Button
            variant="link"
            size="sm"
            className="mt-1"
            onClick={() => {
              item.action?.onSelect()
              dismiss(item.id)
            }}
          >
            {item.action.label}
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Đóng thông báo: ${item.title}`}
        className="-mr-2 -mt-2 size-9 min-h-9"
        onClick={() => dismiss(item.id)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}

export function NotificationExamples() {
  const notifications = useNotifications()
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() => notifications.success('Đã lưu thay đổi', 'Thông tin mẫu đã được cập nhật.')}
        startIcon={<Check aria-hidden="true" />}
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          notifications.error('Không thể tải nội dung', 'Kiểm tra kết nối rồi thử lại.')
        }
      >
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          notifications.warning('Phiên sắp hết hạn', 'Lưu nội dung đang soạn trước khi tiếp tục.')
        }
      >
        Warning toast
      </Button>
      <Button
        variant="outline"
        onClick={() => notifications.info('Mẹo học', 'Ôn lại từ vựng sau mỗi bài.')}
      >
        Info toast
      </Button>
    </div>
  )
}

export type NotificationAction = { label: string; onSelect: () => void }
export type NotificationContent = ReactNode
