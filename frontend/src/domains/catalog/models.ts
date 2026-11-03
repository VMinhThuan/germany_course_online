import type {
  ContentStatus,
  CourseStatus,
  LessonType,
  ProgressStatus,
  SectionType,
} from '@/domains/contracts/backend-enums'

export type MoneyAmount = string

export interface CourseSummaryModel {
  id: string
  code: string
  slug: string
  title: string
  level: string
  shortDescription: string
  thumbnailUrl?: string
  priceVnd?: MoneyAmount
  accessDurationMonths?: number
  previewAvailable?: boolean
  status: CourseStatus
  chapterCount?: number
  lessonCount?: number
}

export interface LessonSummaryModel {
  id: string
  title: string
  lessonType: LessonType
  contentStatus: ContentStatus
  estimatedMinutes?: number
  countsTowardProgress: boolean
  progressStatus: ProgressStatus
}

export interface CourseSectionModel {
  id: string
  courseId: string
  title: string
  description?: string
  sectionType: SectionType
  contentStatus: ContentStatus
  sortOrder: number
  lessons: readonly LessonSummaryModel[]
}

export interface CourseDetailModel extends CourseSummaryModel {
  description: string
  objectives: readonly string[]
  requirements: readonly string[]
  sections: readonly CourseSectionModel[]
}

export type CourseAccessViewModel =
  | { kind: 'available'; label: string }
  | { kind: 'customer-preview'; label: string; source: 'customer-requested-demo' }
  | { kind: 'restricted'; label: string; reason: string }
  | { kind: 'expired-display'; label: string; expiresAt: string }
  | { kind: 'loading'; label?: string }
  | { kind: 'error'; label: string; message: string }

export interface MockPreviewManifest {
  mode: 'MOCK_ONLY'
  source: 'customer-requested-demo'
  courseCode: 'A1.1'
  sectionIds: readonly [string, string, string]
  notice: string
}

export function isMockPreviewSection(
  section: Pick<CourseSectionModel, 'id' | 'sectionType'>,
  manifest: MockPreviewManifest,
): boolean {
  return section.sectionType === 'CHAPTER' && manifest.sectionIds.includes(section.id)
}
