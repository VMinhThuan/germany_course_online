import { KeyRound, MonitorSmartphone, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardHeader,
  CardTitle,
  FormField,
  TextInput,
} from '@/shared/ui'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import { useNotifications } from '@/shared/ui/notifications'
import { DomainState } from '@/domains/shared/presentation'
import type { SessionSummaryViewModel, StudentProfileViewModel } from './models'

export function StudentProfileCard({ profile }: { profile: StudentProfileViewModel }) {
  const initials =
    profile.displayName
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(-2)
      .join('')
      .toUpperCase() || profile.email.slice(0, 1).toUpperCase()
  return (
    <Card className="flex items-center gap-4 p-5">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-bold">
          {profile.displayName || 'Học viên'}
        </p>
        <p className="truncate text-sm text-ink-secondary">{profile.email}</p>
        <p className="mt-1 text-xs text-ink-muted">
          Tài khoản {profile.status === 'ACTIVE' ? 'đang hoạt động' : 'đang bị khóa'}
        </p>
      </div>
    </Card>
  )
}

export function ProfileForm({
  profile,
  onSave,
}: {
  profile: StudentProfileViewModel
  onSave: (values: { displayName: string }) => Promise<void> | void
}) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [pending, setPending] = useState(false)
  const notifications = useNotifications()
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await onSave({ displayName })
      notifications.success('Đã lưu hồ sơ.')
    } catch {
      notifications.notify({
        kind: 'error',
        title: 'Chưa lưu được hồ sơ. Hãy thử lại.',
        duration: 0,
      })
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-4 rounded-2xl border border-border-subtle bg-card-surface p-5"
    >
      <h2 className="font-display text-xl font-bold">Thông tin hồ sơ</h2>
      <FormField id="profile-name" label="Tên hiển thị">
        {(describedBy, invalid) => (
          <TextInput
            id="profile-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoComplete="name"
          />
        )}
      </FormField>
      <FormField id="profile-email" label="Email">
        {(describedBy, invalid) => (
          <TextInput
            id="profile-email"
            value={profile.email}
            readOnly
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoComplete="email"
          />
        )}
      </FormField>
      <Button loading={pending} type="submit">
        Lưu thay đổi
      </Button>
    </form>
  )
}

export function AccountNavigation({
  current,
  items,
}: {
  current: string
  items?: readonly { id: string; label: string; href: string }[]
}) {
  const defaults = [
    { id: 'profile', label: 'Hồ sơ', href: '/student/profile' },
    { id: 'security', label: 'Bảo mật', href: '/student/security/password' },
    { id: 'sessions', label: 'Phiên đăng nhập', href: '/student/security/sessions' },
  ]
  const links = items ?? defaults
  return (
    <nav aria-label="Tài khoản" className="flex flex-wrap gap-2">
      {links.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={item.id === current ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-action-focus ${item.id === current ? 'bg-surface-blue text-ink-primary' : 'text-ink-secondary hover:bg-surface-muted'}`}
        >
          <UserRound aria-hidden="true" className="size-4" />
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export function SecurityNotice({
  children = 'Thông tin phiên và bảo mật được hiển thị ở mức an toàn. Bí mật xác thực không xuất hiện trong khu vực học viên.',
}: {
  children?: string
}) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-xl border border-info-foreground/20 bg-info-surface p-4"
    >
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info-foreground" />
      <p className="text-sm leading-6 text-ink-secondary">{children}</p>
    </div>
  )
}

export function SessionSummary({ session }: { session: SessionSummaryViewModel }) {
  const label =
    session.status === 'ACTIVE'
      ? 'Đang hoạt động'
      : session.status === 'REVOKED'
        ? 'Đã kết thúc'
        : 'Đã hết hạn'
  return (
    <Card className="flex min-w-0 items-start gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-blue">
        <MonitorSmartphone aria-hidden="true" className="size-5 text-action-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{session.deviceName || 'Thiết bị đăng nhập'}</p>
        <p className="mt-1 text-sm text-ink-secondary">
          {label}
          {session.isCurrent ? ' · Phiên hiện tại' : ''}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Hoạt động gần nhất: {formatDateTimeInTimezone(session.lastActiveAt)}
        </p>
      </div>
    </Card>
  )
}

export function SessionList({
  sessions,
  canRevoke = false,
  onRevoke,
}: {
  sessions: readonly SessionSummaryViewModel[]
  canRevoke?: boolean
  onRevoke?: (sessionId: string) => void
}) {
  if (!sessions.length)
    return (
      <AccountEmptyState
        title="Chưa có phiên đăng nhập"
        message="Thông tin phiên đăng nhập sẽ xuất hiện tại đây."
      />
    )
  return (
    <ul aria-label="Phiên đăng nhập" className="grid gap-3">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <SessionSummary session={session} />
          {canRevoke && !session.isCurrent && session.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => onRevoke?.(session.id)}>
              Kết thúc phiên
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

export function AccountEmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <DomainState kind="empty" title={title} message={message}>
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </DomainState>
  )
}

export function AccountSecurityLinks() {
  return (
    <Card className="grid gap-2 p-5">
      <CardHeader className="p-0">
        <CardTitle>Bảo mật tài khoản</CardTitle>
      </CardHeader>
      <a
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-action-primary hover:underline"
        href="/student/security/password"
      >
        <KeyRound aria-hidden="true" className="size-4" />
        Đổi mật khẩu
      </a>
      <a
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-action-primary hover:underline"
        href="/student/security/sessions"
      >
        <MonitorSmartphone aria-hidden="true" className="size-4" />
        Xem phiên đăng nhập
      </a>
    </Card>
  )
}
