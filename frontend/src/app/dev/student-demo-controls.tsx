import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ShieldAlert, WifiOff } from 'lucide-react'
import { Button } from '@/shared/ui'
import { useAuthSession } from '@/app/auth/auth-session'

type Operation = 'login' | 'register' | 'forgot' | 'reset' | 'student'
type FailureMode =
  'invalid' | 'forbidden' | 'conflict' | 'unprocessable' | 'rate-limit' | 'network' | 'service'
type ResetState = 'valid' | 'invalid' | 'expired' | 'used'

function dispatchScenario(operation: Operation, mode: FailureMode) {
  window.dispatchEvent(new CustomEvent('student-demo:scenario', { detail: { operation, mode } }))
}

export function StudentDemoDevControls() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { session } = useAuthSession()

  if (!import.meta.env.DEV) return null

  const failNextStudentRequest = () => {
    dispatchScenario('student', 'network')
    void queryClient.invalidateQueries({ queryKey: ['student'] })
  }

  const revokeSession = () => {
    window.dispatchEvent(new Event('student-demo:revoke-current-session'))
    void queryClient.invalidateQueries({ queryKey: ['student'] })
  }

  const setResetState = (state: ResetState) => {
    window.dispatchEvent(new CustomEvent('student-demo:reset-state', { detail: { state } }))
    void queryClient.invalidateQueries({ queryKey: ['auth', 'reset-token'] })
  }

  return (
    <aside
      data-dev-controls
      aria-label="Điều khiển tình huống demo"
      className="fixed bottom-3 right-3 z-[80] max-w-[min(22rem,calc(100vw-1.5rem))]"
    >
      <Button
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="student-demo-dev-controls"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex shadow-raised"
      >
        <ShieldAlert aria-hidden="true" />
        Điều khiển demo
        <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : ''} />
      </Button>
      {open && (
        <div
          id="student-demo-dev-controls"
          className="mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border-strong bg-card-surface p-4 shadow-raised"
        >
          <h2 className="font-display font-bold">Trạng thái chỉ dành cho phát triển</h2>
          <p className="mt-1 text-xs leading-5 text-ink-secondary">
            Các nút này mô phỏng lỗi repository; chúng không gọi backend.
          </p>
          <div className="mt-4 grid gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('login', 'invalid')}
            >
              Lần đăng nhập tiếp theo: 401
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('login', 'forbidden')}
            >
              Lần đăng nhập tiếp theo: 403
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('login', 'rate-limit')}
            >
              Lần đăng nhập tiếp theo: 429
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('login', 'service')}
            >
              Lần đăng nhập tiếp theo: 500
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('login', 'network')}
            >
              Lần đăng nhập tiếp theo: mất kết nối
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('register', 'conflict')}
            >
              Đăng ký tiếp theo: xung đột
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('forgot', 'network')}
            >
              Quên mật khẩu tiếp theo: mất kết nối
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchScenario('reset', 'network')}
            >
              Đặt lại mật khẩu tiếp theo: mất kết nối
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" onClick={() => setResetState('expired')}>
                Token hết hạn
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetState('used')}>
                Token đã dùng
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetState('invalid')}>
                Token không hợp lệ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetState('valid')}>
                Token hợp lệ
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={failNextStudentRequest}>
              <WifiOff aria-hidden="true" />
              Lần tải học viên tiếp theo bị lỗi
            </Button>
            <Button size="sm" variant="destructive" disabled={!session} onClick={revokeSession}>
              Thu hồi phiên hiện tại rồi tải lại
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!session}
              onClick={() => {
                window.dispatchEvent(new Event('student-demo:invalidate-current-session'))
                void queryClient.invalidateQueries({ queryKey: ['student'] })
              }}
            >
              Phiên hiện tại không còn hợp lệ
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}
