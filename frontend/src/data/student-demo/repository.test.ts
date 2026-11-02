import { beforeEach, describe, expect, it } from 'vitest'
import { EnrollmentStatus } from '@/domains/contracts/backend-enums'
import { createStudentDemoRepositories } from './repository'
import { DEMO_ACCOUNTS, DEMO_NOW } from './fixtures'
import { DemoRepositoryError } from './types'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() {
    return this.values.size
  }
  clear() {
    this.values.clear()
  }
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
  setItem(key: string, value: string) {
    this.values.set(key, String(value))
  }
}

function createRepositories(now = DEMO_NOW) {
  return createStudentDemoRepositories({ latencyMs: 0, storage: new MemoryStorage(), now })
}

describe('student demo repository', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('offers only fictional .test demo identities', () => {
    const repositories = createRepositories()
    expect(repositories.auth.listDemoAccounts()).toEqual(DEMO_ACCOUNTS)
    expect(DEMO_ACCOUNTS.every((account) => account.email.endsWith('.test'))).toBe(true)
  })

  it('returns the registered persona with no courses and no progress', async () => {
    const repositories = createRepositories()
    const session = await repositories.auth.signInWithDemoAccount('registered-without-enrollment')
    const dashboard = await repositories.student.getDashboard(session.id)
    expect(dashboard.profile.email).toBe('linh.demo@learn.test')
    expect(dashboard.courses).toEqual([])
  })

  it('supplies active and partial progress without deriving percentages in UI', async () => {
    const repositories = createRepositories()
    const active = await repositories.auth.signInWithDemoAccount('active-student')
    const activeDashboard = await repositories.student.getDashboard(active.id)
    expect(activeDashboard.courses[0]?.progress).toMatchObject({
      percent: 0,
      completedLessons: 0,
      totalLessons: 7,
    })

    const partial = await repositories.auth.signInWithDemoAccount('partially-completed-student')
    const partialDashboard = await repositories.student.getDashboard(partial.id)
    expect(partialDashboard.courses[0]?.progress).toMatchObject({
      percent: 29,
      completedLessons: 2,
      totalLessons: 7,
    })
  })

  it('derives expired display from expiresAt and preserves exact V3 enrollment enums', async () => {
    const repositories = createRepositories()
    const session = await repositories.auth.signInWithDemoAccount('expired-entitlement')
    const courses = await repositories.student.listCourses(session.id)
    expect(courses[0]?.enrollment).toMatchObject({
      status: 'ACTIVE',
      accessState: 'expired-display',
    })
    expect(EnrollmentStatus).toEqual(['ACTIVE', 'REVOKED'])
    expect(EnrollmentStatus).not.toContain('EXPIRED')
  })

  it('keeps registrations and passwords in ephemeral adapter memory and persists only a demo identifier', async () => {
    const storage = new MemoryStorage()
    const repositories = createStudentDemoRepositories({ latencyMs: 0, storage })
    const password = 'temporary-demo-password'
    await repositories.auth.registerDemoAccount({
      displayName: 'Người học thử',
      email: 'learner@example.test',
      password,
    })
    const session = await repositories.auth.signInWithCredentials('learner@example.test', password)
    expect(session.profile.email).toBe('learner@example.test')
    expect(storage.length).toBe(1)
    expect(storage.getItem('deutsch-a11.demo-session-user')).toBe(session.userId)
    expect(
      [...Array.from({ length: storage.length }, (_, index) => storage.key(index) ?? '')].join(' '),
    ).not.toContain(password)
    expect(storage.getItem('deutsch-a11.demo-session-user')).not.toContain(password)
    await repositories.auth.logout()
    expect(storage.length).toBe(0)
  })

  it('rejects duplicate and non-fictional account input with preserved generic statuses', async () => {
    const repositories = createRepositories()
    await expect(
      repositories.auth.registerDemoAccount({
        displayName: 'Duplicate',
        email: DEMO_ACCOUNTS[0]!.email,
        password: 'x',
      }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      repositories.auth.registerDemoAccount({
        displayName: 'Real',
        email: 'person@example.com',
        password: 'x',
      }),
    ).rejects.toMatchObject({ status: 422 })
    await expect(
      repositories.auth.signInWithCredentials(DEMO_ACCOUNTS[0]!.email, 'wrong'),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('returns the same controlled reset token shape without revealing account existence', async () => {
    const repositories = createRepositories()
    const known = await repositories.auth.requestPasswordReset(DEMO_ACCOUNTS[0]!.email)
    const unknown = await repositories.auth.requestPasswordReset('nobody@learn.test')
    expect(known).toEqual(unknown)
    expect(known.token).toBe('demo-reset-token-v1')
    expect(await repositories.auth.getResetTokenState(known.token)).toBe('valid')
    expect(await repositories.auth.getResetTokenState('other-token')).toBe('invalid')
  })

  it('marks a demo reset token used after a successful mock reset', async () => {
    const repositories = createRepositories()
    const email = 'learner@example.test'
    await repositories.auth.registerDemoAccount({
      displayName: 'Người học',
      email,
      password: 'old',
    })
    const { token } = await repositories.auth.requestPasswordReset(email)
    await repositories.auth.resetDemoPassword(token, 'new')
    expect(await repositories.auth.getResetTokenState(token)).toBe('used')
    await expect(repositories.auth.resetDemoPassword(token, 'again')).rejects.toBeInstanceOf(
      DemoRepositoryError,
    )
  })

  it('returns controlled invalid, expired, and used reset-token states', async () => {
    const repositories = createStudentDemoRepositories({
      latencyMs: 0,
      storage: new MemoryStorage(),
      devScenarios: true,
    })
    const { token } = await repositories.auth.requestPasswordReset('linh.demo@learn.test')

    for (const state of ['invalid', 'expired', 'used'] as const) {
      window.dispatchEvent(new CustomEvent('student-demo:reset-state', { detail: { state } }))
      expect(await repositories.auth.getResetTokenState(token)).toBe(state)
    }
  })

  it('keeps student fixtures isolated per repository instance', async () => {
    const first = createRepositories()
    const second = createRepositories()
    await first.auth.registerDemoAccount({
      displayName: 'Riêng tư',
      email: 'isolated@example.test',
      password: 'x',
    })
    await expect(
      second.auth.signInWithCredentials('isolated@example.test', 'x'),
    ).rejects.toMatchObject({ status: 401 })
  })
})
