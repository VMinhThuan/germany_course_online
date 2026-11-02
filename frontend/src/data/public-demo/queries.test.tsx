import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PUBLIC_DEMO_COURSE } from './fixtures'
import { createPublicDemoRepository } from './repository'
import { usePublicCourseCatalog } from './queries'
import type { CourseSummaryModel } from '@/domains/catalog/models'
import type { PublicCourseRepository } from './types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('public demo repository queries', () => {
  it('exposes a loading state and resolves repository data', async () => {
    let resolveCatalog: ((courses: readonly CourseSummaryModel[]) => void) | undefined
    const base = createPublicDemoRepository()
    const repository: PublicCourseRepository = {
      ...base,
      listCourses: vi.fn(
        () =>
          new Promise<readonly CourseSummaryModel[]>((resolve) => {
            resolveCatalog = resolve
          }),
      ),
    }
    const { result } = renderHook(() => usePublicCourseCatalog(repository), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(true)
    await act(async () => {
      resolveCatalog?.([PUBLIC_DEMO_COURSE])
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]?.slug).toBe('tieng-duc-a1-1')
  })

  it('keeps repository errors visible to the page state handler', async () => {
    const base = createPublicDemoRepository()
    const repository: PublicCourseRepository = {
      ...base,
      listCourses: async () => {
        throw new Error('demo repository unavailable')
      },
    }
    const { result } = renderHook(() => usePublicCourseCatalog(repository), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('demo repository unavailable')
  })
})
