import { describe, expect, it, vi } from 'vitest'
import type { ApiAssetAssociation } from '@/lib/api/types'

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>()
  return { ...actual, apiRequest: vi.fn() }
})

import { apiRequest } from '@/lib/api/client'
import { adminRepository } from './admin-repository'

const requestMock = vi.mocked(apiRequest)

const association = {
  id: 'association-1',
  exerciseId: 'exercise-id',
  assetId: 'asset-id',
  assetRole: 'QUESTION_PDF',
  title: 'worksheet.pdf',
  sortOrder: 0,
  media: { id: 'asset-id', originalName: 'worksheet.pdf' },
} as ApiAssetAssociation

describe('adminRepository asset associations', () => {
  it('normalizes the array returned by the exercise assets endpoint', async () => {
    requestMock.mockResolvedValueOnce([association])

    await expect(adminRepository.listExerciseAssets('exercise-id')).resolves.toEqual({
      items: [association],
    })
    expect(requestMock).toHaveBeenCalledWith('/admin/exercises/exercise-id/assets')
  })

  it('keeps accepting an items response for lesson assets', async () => {
    requestMock.mockResolvedValueOnce({ items: [association] })

    await expect(adminRepository.listLessonAssets('lesson-id')).resolves.toEqual({
      items: [association],
    })
    expect(requestMock).toHaveBeenCalledWith('/admin/lessons/lesson-id/assets')
  })
})
