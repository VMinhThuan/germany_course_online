import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { Button } from './primitives'
import { InlineAlert } from './feedback'
import { cn } from './cn'

export type DialogKind = 'confirm' | 'info' | 'warning' | 'error'

export type DialogRequest = {
  kind: DialogKind
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm?: () => void | Promise<void>
}

type DialogApi = {
  openDialog: (request: DialogRequest) => void
  confirm: (request: Omit<DialogRequest, 'kind'>) => void
  info: (title: string, description: string) => void
  warning: (title: string, description: string) => void
  error: (title: string, description: string) => void
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: PropsWithChildren) {
  const [request, setRequest] = useState<DialogRequest | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const openDialog = useCallback((nextRequest: DialogRequest) => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRequest(nextRequest)
  }, [])
  const closeDialog = useCallback(() => {
    setRequest(null)
    const target = returnFocusRef.current
    window.setTimeout(() => {
      if (target?.isConnected) target.focus()
    }, 0)
  }, [])

  const api: DialogApi = {
    openDialog,
    confirm: (next) => openDialog({ ...next, kind: 'confirm' }),
    info: (title, description) => openDialog({ kind: 'info', title, description }),
    warning: (title, description) => openDialog({ kind: 'warning', title, description }),
    error: (title, description) => openDialog({ kind: 'error', title, description }),
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request?.kind === 'confirm' && (
        <ConfirmDialog open request={request} onOpenChange={(open) => !open && closeDialog()} />
      )}
      {request && request.kind !== 'confirm' && (
        <BaseDialog
          open
          onOpenChange={(open) => !open && closeDialog()}
          title={request.title}
          description={request.description}
          tone={request.kind}
          footer={<Button onClick={closeDialog}>Đã hiểu</Button>}
        />
      )}
    </DialogContext.Provider>
  )
}

export function useDialogs() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialogs must be used within DialogProvider.')
  return context
}

export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tone = 'info',
  closeLabel = 'Đóng hộp thoại',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  tone?: Exclude<DialogKind, 'confirm'>
  closeLabel?: string
}) {
  const Icon =
    tone === 'error'
      ? AlertCircle
      : tone === 'warning'
        ? TriangleAlert
        : tone === 'info'
          ? Info
          : CheckCircle2
  const iconTone =
    tone === 'error'
      ? 'text-danger-foreground bg-danger-surface'
      : tone === 'warning'
        ? 'text-warning-foreground bg-warning-surface'
        : 'text-info-foreground bg-info-surface'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-overlay grid max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-card border border-border-subtle bg-card-surface p-5 shadow-raised outline-none sm:p-7">
          <div className="flex items-start gap-4 pr-8">
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', iconTone)}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <DialogPrimitive.Title className="font-display text-xl font-bold tracking-tight text-ink-primary">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm leading-6 text-ink-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>
          {children}
          {footer && (
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">{footer}</div>
          )}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={closeLabel}
              className="absolute right-3 top-3 size-9 min-h-9"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function ConfirmDialog({
  open,
  request,
  onOpenChange,
}: {
  open: boolean
  request: DialogRequest
  onOpenChange: (open: boolean) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await request.onConfirm?.()
      onOpenChange(false)
    } catch {
      setError('Không thể hoàn tất thao tác. Hãy thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-overlay grid max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-card border border-border-subtle bg-card-surface p-5 shadow-raised outline-none sm:p-7">
          <div className="space-y-2 pr-8">
            <AlertDialogPrimitive.Title className="font-display text-xl font-bold tracking-tight text-ink-primary">
              {request.title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm leading-6 text-ink-secondary">
              {request.description}
            </AlertDialogPrimitive.Description>
          </div>
          {error && (
            <InlineAlert tone="danger" title="Thao tác chưa hoàn tất">
              {error}
            </InlineAlert>
          )}
          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={submitting}>
                {request.cancelLabel ?? 'Hủy'}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={request.destructive ? 'destructive' : 'primary'}
                loading={submitting}
                onClick={handleConfirm}
              >
                {request.confirmLabel ?? 'Xác nhận'}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: 'left' | 'right'
  children: ReactNode
  className?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 z-overlay flex w-[min(22rem,calc(100vw-2.5rem))] flex-col bg-card-surface p-5 shadow-raised outline-none',
            side === 'left'
              ? 'left-0 border-r border-border-subtle'
              : 'right-0 border-l border-border-subtle',
            className,
          )}
        >
          <div className="mb-7 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogPrimitive.Title className="font-display text-lg font-bold">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-ink-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Đóng menu"
                className="size-10 min-h-10 shrink-0"
              >
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function DialogExamples() {
  const dialogs = useDialogs()

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() =>
          dialogs.confirm({
            title: 'Lưu thay đổi?',
            description: 'Thao tác mẫu này sẽ cập nhật nội dung đang hiển thị.',
            confirmLabel: 'Lưu thay đổi',
            onConfirm: () => new Promise((resolve) => window.setTimeout(resolve, 450)),
          })
        }
      >
        Xác nhận thao tác
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          dialogs.info('Thông tin', 'Đây là hộp thoại thông tin. Không có hành động phá hủy.')
        }
      >
        Thông tin
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          dialogs.warning('Cần lưu ý', 'Hãy kiểm tra lại nội dung trước khi tiếp tục.')
        }
      >
        Cảnh báo
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          dialogs.error('Không thể kết nối', 'Dữ liệu mẫu chưa sẵn sàng. Thử lại sau.')
        }
      >
        Thông báo lỗi
      </Button>
    </div>
  )
}
