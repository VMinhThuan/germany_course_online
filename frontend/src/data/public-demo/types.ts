import type { CourseDetailModel, CourseSummaryModel } from '@/domains/catalog/models'
import type { MediaViewModel } from '@/domains/media/models'
import type { ApiLessonVideo } from '@/lib/api/types'

export interface PublicPreviewManifest {
  courseSlug: string
  sectionIds: readonly string[]
  notice: string
}

export interface PublicPreviewLessonContent {
  courseSlug: string
  sectionId: string
  lessonId: string
  paragraphs: readonly string[]
  keyPhrases: readonly { german: string; vietnamese: string }[]
  video: ApiLessonVideo | null
  media: readonly MediaViewModel[]
  exercises: readonly PublicPreviewExercise[]
}

export interface PublicPreviewExercise {
  id: string
  lessonId: string
  title: string
  description?: string | null
  instructions: string
  exerciseType: 'FILE_BASED' | 'QUIZ'
  completionMode: 'MANUAL' | 'QUIZ_SUBMISSION'
  isRequired: boolean
  sortOrder: number
}

export interface PublicCourseRepository {
  listCourses(): Promise<readonly CourseSummaryModel[]>
  getCourseBySlug(slug: string): Promise<CourseDetailModel | null>
  getPreviewManifest(courseSlug: string): Promise<PublicPreviewManifest | null>
  getPreviewLesson(
    courseSlug: string,
    sectionId: string,
    lessonId: string,
  ): Promise<PublicPreviewLessonContent | null>
}

export interface PublicPreviewSection {
  id: string
  courseId: string
  title: string
  sectionType: 'CHAPTER'
  contentStatus: 'PUBLISHED'
  sortOrder: number
  lessons: CourseDetailModel['sections'][number]['lessons']
}

export type PreviewExperience =
  | { kind: 'course-not-found' }
  | { kind: 'preview-not-configured'; course: CourseDetailModel }
  | { kind: 'invalid-preview-manifest'; course: CourseDetailModel }
  | {
      kind: 'invalid-section'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
    }
  | {
      kind: 'restricted-section'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
      requestedSection: CourseDetailModel['sections'][number]
    }
  | {
      kind: 'empty-section'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
      section: PublicPreviewSection
    }
  | {
      kind: 'lesson-not-found'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
      section: PublicPreviewSection
    }
  | {
      kind: 'content-missing'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
      section: PublicPreviewSection
      lesson: PublicPreviewSection['lessons'][number]
    }
  | {
      kind: 'available'
      course: CourseDetailModel
      sections: readonly PublicPreviewSection[]
      manifest: PublicPreviewManifest
      section: PublicPreviewSection
      lesson: PublicPreviewSection['lessons'][number]
      content: PublicPreviewLessonContent
      contentByLessonId: Readonly<Record<string, PublicPreviewLessonContent>>
    }
