import type { ProgressStatus } from '@/domains/contracts/backend-enums'

/** Backend-computed summary values; UI components only present these values. */
export interface CourseProgressViewModel {
  courseId: string
  percent: number
  completedLessons: number
  totalLessons: number
  completedLabel?: string
}

export interface LessonProgressItemViewModel {
  lessonId: string
  title: string
  status: ProgressStatus
  href?: string
  sectionId?: string
  sectionTitle?: string
  lessonNumber?: number
}

export type NoteSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
