import type {
  CourseAccessViewModel,
  CourseSectionModel,
  LessonSummaryModel,
} from '@/domains/catalog/models'
import type { MediaViewModel } from '@/domains/media/models'
import type { ApiLessonVideo } from '@/lib/api/types'

export interface CourseTreeViewModel {
  courseId: string
  courseTitle: string
  sections: readonly CourseSectionModel[]
  currentLessonId?: string
}

export interface LessonContentViewModel {
  lesson: LessonSummaryModel
  paragraphs: readonly string[]
  video: ApiLessonVideo | null
  media: readonly MediaViewModel[]
  access: CourseAccessViewModel
}

export interface LessonNavigationItem {
  id: string
  title: string
  href?: string
  access: CourseAccessViewModel
}

export type LessonCompletionPresentation = 'not-started' | 'in-progress' | 'completed'
