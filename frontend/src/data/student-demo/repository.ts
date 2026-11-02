import type { StudentProfileViewModel } from '@/domains/account/models'
import { DEMO_ACCOUNTS, DEMO_COURSE_BY_PERSONA, DEMO_NOW } from './fixtures'
import {
  DemoRepositoryError,
  type DemoPersona,
  type DemoSession,
  type StudentDemoRepositories,
} from './types'

const SESSION_STORAGE_KEY = 'deutsch-a11.demo-session-user'
const DEMO_RESET_TOKEN = 'demo-reset-token-v1'

type DevFailureMode =
  'invalid' | 'forbidden' | 'conflict' | 'unprocessable' | 'rate-limit' | 'network' | 'service'
type DevResetState = 'valid' | 'invalid' | 'expired' | 'used'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isFictionalEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.test$/i.test(email)
}

function readStoredUserId(storage: Storage | undefined) {
  try {
    return storage?.getItem(SESSION_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

export function createStudentDemoRepositories(
  options: { latencyMs?: number; storage?: Storage; devScenarios?: boolean; now?: string } = {},
): StudentDemoRepositories {
  const latencyMs = Math.max(0, options.latencyMs ?? 120)
  const storage =
    options.storage ?? (typeof window === 'undefined' ? undefined : window.sessionStorage)
  const accountByPersona = new Map<
    DemoPersona,
    { userId: string; profile: StudentProfileViewModel; persona: DemoPersona }
  >()
  const accountByEmail = new Map<
    string,
    {
      userId: string
      profile: StudentProfileViewModel
      persona: DemoPersona | 'registered-account'
    }
  >()
  const passwords = new Map<string, string>()
  const revokedSessionIds = new Set<string>()
  const resetTokenByEmail = new Map<string, { token: string; state: DevResetState }>()
  const failures = new Map<'login' | 'register' | 'forgot' | 'reset' | 'student', DevFailureMode>()
  let sessionSequence = 0
  let activeSession: DemoSession | null = null
  let currentResetEmail: string | null = null
  let resetState: DevResetState = 'valid'

  for (const [index, account] of DEMO_ACCOUNTS.entries()) {
    const profile: StudentProfileViewModel = {
      displayName: account.displayName,
      email: account.email,
      status: 'ACTIVE',
    }
    const record = { userId: `demo-student-${index + 1}`, profile, persona: account.persona }
    accountByPersona.set(account.persona, record)
    accountByEmail.set(normalizeEmail(account.email), record)
  }

  const wait = async () => {
    if (latencyMs > 0) await new Promise((resolve) => window.setTimeout(resolve, latencyMs))
  }

  const takeFailure = (operation: 'login' | 'register' | 'forgot' | 'reset' | 'student') => {
    const mode = failures.get(operation)
    failures.delete(operation)
    if (!mode) return
    const statusByMode: Partial<Record<DevFailureMode, number>> = {
      invalid: 401,
      forbidden: 403,
      conflict: 409,
      unprocessable: 422,
      'rate-limit': 429,
      service: 500,
    }
    if (mode === 'network')
      throw new DemoRepositoryError({ kind: 'network', message: 'Demo network failure' })
    const status = statusByMode[mode]
    if (status) throw new DemoRepositoryError({ status, message: 'Provisional demo failure' })
  }

  const persistUserId = (userId: string | null) => {
    try {
      if (!storage) return
      if (userId) storage.setItem(SESSION_STORAGE_KEY, userId)
      else storage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // A browser may block storage. The session still works until navigation/reload.
    }
  }

  const startSession = (record: {
    userId: string
    profile: StudentProfileViewModel
    persona: DemoPersona | 'registered-account'
  }) => {
    if (activeSession) revokedSessionIds.add(activeSession.id)
    activeSession = {
      id: `demo-session-${++sessionSequence}`,
      userId: record.userId,
      persona: record.persona,
      profile: structuredClone(record.profile),
    }
    persistUserId(record.userId)
    return structuredClone(activeSession)
  }

  const sessionForId = (sessionId: string) => {
    if (revokedSessionIds.has(sessionId)) {
      throw new DemoRepositoryError({
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'SESSION_REVOKED',
      })
    }
    if (!activeSession || sessionId !== activeSession.id) {
      throw new DemoRepositoryError({
        status: 401,
        code: 'DEMO_SESSION_INVALID',
        message: 'Demo session is not active',
      })
    }
    return activeSession
  }

  if (import.meta.env.DEV && options.devScenarios && typeof window !== 'undefined') {
    window.addEventListener('student-demo:scenario', (event) => {
      const detail = (
        event as CustomEvent<{
          operation: 'login' | 'register' | 'forgot' | 'reset' | 'student'
          mode: DevFailureMode
        }>
      ).detail
      if (detail?.operation && detail.mode) failures.set(detail.operation, detail.mode)
    })
    window.addEventListener('student-demo:reset-state', (event) => {
      const detail = (event as CustomEvent<{ state: DevResetState }>).detail
      if (detail?.state) resetState = detail.state
    })
    window.addEventListener('student-demo:revoke-current-session', () => {
      if (activeSession) revokedSessionIds.add(activeSession.id)
    })
    window.addEventListener('student-demo:invalidate-current-session', () => {
      activeSession = null
    })
  }

  const repositories: StudentDemoRepositories = {
    auth: {
      listDemoAccounts() {
        return DEMO_ACCOUNTS
      },
      async restoreSession() {
        await wait()
        const userId = readStoredUserId(storage)
        if (!userId) return null
        const record = [...accountByPersona.values()].find((item) => item.userId === userId)
        if (!record) {
          persistUserId(null)
          return null
        }
        if (activeSession?.userId === userId && !revokedSessionIds.has(activeSession.id)) {
          return structuredClone(activeSession)
        }
        return startSession(record)
      },
      async signInWithDemoAccount(persona) {
        await wait()
        takeFailure('login')
        const record = accountByPersona.get(persona)
        if (!record)
          throw new DemoRepositoryError({ status: 404, message: 'Demo account not found' })
        return startSession(record)
      },
      async signInWithCredentials(email, password) {
        await wait()
        takeFailure('login')
        const normalized = normalizeEmail(email)
        const record = accountByEmail.get(normalized)
        const knownPassword = passwords.get(normalized)
        if (!record || !knownPassword || knownPassword !== password) {
          throw new DemoRepositoryError({ status: 401, message: 'Demo credentials did not match' })
        }
        return startSession(record)
      },
      async registerDemoAccount(input) {
        await wait()
        takeFailure('register')
        const email = normalizeEmail(input.email)
        if (!isFictionalEmail(email)) {
          throw new DemoRepositoryError({ status: 422, message: 'Use a fictional .test address.' })
        }
        if (accountByEmail.has(email)) {
          throw new DemoRepositoryError({ status: 409, message: 'Demo email already exists' })
        }
        const userId = `demo-registered-${accountByEmail.size + 1}`
        const profile: StudentProfileViewModel = {
          displayName: input.displayName.trim(),
          email,
          status: 'ACTIVE',
        }
        accountByEmail.set(email, { userId, profile, persona: 'registered-account' })
        passwords.set(email, input.password)
      },
      async requestPasswordReset(email) {
        await wait()
        takeFailure('forgot')
        const normalized = normalizeEmail(email)
        currentResetEmail = normalized
        resetState = 'valid'
        resetTokenByEmail.set(normalized, { token: DEMO_RESET_TOKEN, state: 'valid' })
        return { token: DEMO_RESET_TOKEN }
      },
      async getResetTokenState(token) {
        await wait()
        const reset = currentResetEmail ? resetTokenByEmail.get(currentResetEmail) : undefined
        if (token !== DEMO_RESET_TOKEN || !reset) return 'invalid'
        return resetState === 'valid' ? reset.state : resetState
      },
      async resetDemoPassword(token, password) {
        await wait()
        takeFailure('reset')
        const state = await repositories.auth.getResetTokenState(token)
        if (state !== 'valid' || !currentResetEmail) {
          throw new DemoRepositoryError({
            status: 422,
            code: `DEMO_RESET_${state.toUpperCase()}`,
            message: `Demo token ${state}`,
          })
        }
        if (accountByEmail.has(currentResetEmail)) passwords.set(currentResetEmail, password)
        resetState = 'used'
        const reset = resetTokenByEmail.get(currentResetEmail)
        if (reset) reset.state = 'used'
      },
      async logout() {
        await wait()
        if (activeSession) revokedSessionIds.add(activeSession.id)
        activeSession = null
        persistUserId(null)
      },
      clearSession() {
        activeSession = null
        persistUserId(null)
      },
    },
    student: {
      async getDashboard(sessionId) {
        await wait()
        takeFailure('student')
        const session = sessionForId(sessionId)
        const courses =
          session.persona === 'registered-account' ? [] : DEMO_COURSE_BY_PERSONA[session.persona]
        const expired = courses.map((course) => {
          if (course.enrollment.status !== 'ACTIVE') return course
          const isExpired =
            new Date(course.enrollment.expiresAt).getTime() <=
            new Date(options.now ?? DEMO_NOW).getTime()
          return isExpired
            ? {
                ...course,
                enrollment: { ...course.enrollment, accessState: 'expired-display' as const },
              }
            : course
        })
        return { profile: structuredClone(session.profile), courses: structuredClone(expired) }
      },
      async listCourses(sessionId) {
        const dashboard = await repositories.student.getDashboard(sessionId)
        return dashboard.courses
      },
    },
  }

  return repositories
}

export const studentDemoRepositories = createStudentDemoRepositories({
  latencyMs: 180,
  devScenarios: true,
})
