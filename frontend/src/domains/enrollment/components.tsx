import { CircleCheck, CircleX, Clock3 } from 'lucide-react'
import { Badge, Card } from '@/shared/ui'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import type { EnrollmentSummaryViewModel } from './models'

export function EnrollmentAccessPanel({ enrollment }: { enrollment?: EnrollmentSummaryViewModel }) {
  if (!enrollment)
    return (
      <Card className="flex items-start gap-3 border-border-subtle bg-surface-muted p-4">
        <Clock3 aria-hidden="true" className="mt-0.5 size-5 text-ink-muted" />
        <div>
          <h2 className="font-semibold">Chưa có quyền truy cập khóa học</h2>
          <p className="mt-1 text-sm leading-6 text-ink-secondary">
            Thông tin enrollment chưa được cung cấp.
          </p>
        </div>
      </Card>
    )
  const isAvailable = enrollment.accessState === 'available' && enrollment.status === 'ACTIVE'
  const isExpiredDisplay =
    enrollment.accessState === 'expired-display' && enrollment.status === 'ACTIVE'
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="mt-0.5">
        {isAvailable ? (
          <CircleCheck aria-hidden="true" className="size-5 text-success-foreground" />
        ) : (
          <CircleX aria-hidden="true" className="size-5 text-warning-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{enrollment.courseTitle}</h2>
          <Badge tone={isAvailable ? 'success' : isExpiredDisplay ? 'warning' : 'danger'}>
            {isAvailable
              ? 'Có thể tiếp tục học'
              : isExpiredDisplay
                ? 'Quyền truy cập đã hết hạn'
                : 'Quyền truy cập đã thu hồi'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          Enrollment status: {enrollment.status} · Hạn:{' '}
          {formatDateTimeInTimezone(enrollment.expiresAt)}
        </p>
      </div>
    </Card>
  )
}
