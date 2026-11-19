import type { CourseDetailModel } from '@/domains/catalog/models'
import type {
  PublicCourseRepository,
  PublicPreviewLessonContent,
  PublicPreviewManifest,
  PublicPreviewSection,
} from './types'

export function getPreviewSections(
  course: CourseDetailModel,
  manifest: PublicPreviewManifest,
): readonly PublicPreviewSection[] | null {
  if (
    manifest.courseSlug !== course.slug ||
    manifest.sectionIds.length === 0 ||
    new Set(manifest.sectionIds).size !== manifest.sectionIds.length
  ) {
    return null
  }

  const sections = manifest.sectionIds.map((id) =>
    course.sections.find(
      (section) =>
        section.id === id &&
        section.sectionType === 'CHAPTER' &&
        section.contentStatus === 'PUBLISHED',
    ),
  )
  if (sections.some((section) => !section)) return null

  return sections.map((section) => ({
    id: section!.id,
    courseId: course.id,
    title: section!.title,
    sectionType: 'CHAPTER' as const,
    contentStatus: 'PUBLISHED' as const,
    sortOrder: section!.sortOrder,
    lessons: section!.lessons.filter((lesson) => lesson.contentStatus === 'PUBLISHED'),
  }))
}

export function isPreviewSectionAllowed(
  sectionId: string,
  sections: readonly PublicPreviewSection[],
): boolean {
  return sections.some((section) => section.id === sectionId)
}

export async function loadPreviewExperience(
  repository: PublicCourseRepository,
  courseSlug: string,
  sectionId?: string,
  lessonId?: string,
) {
  const course = await repository.getCourseBySlug(courseSlug)
  if (!course) return { kind: 'course-not-found' } as const

  const manifest = await repository.getPreviewManifest(courseSlug)
  if (!manifest) return { kind: 'preview-not-configured', course } as const

  const sections = getPreviewSections(course, manifest)
  if (!sections) return { kind: 'invalid-preview-manifest', course } as const

  const selectedSectionId = sectionId ?? sections[0]?.id
  if (!selectedSectionId) return { kind: 'invalid-preview-manifest', course } as const

  const requestedSection = course.sections.find((section) => section.id === selectedSectionId)
  if (!requestedSection) return { kind: 'invalid-section', course, sections, manifest } as const

  const section = sections.find((candidate) => candidate.id === selectedSectionId)
  if (!section) {
    return {
      kind: 'restricted-section',
      course,
      sections,
      manifest,
      requestedSection,
    } as const
  }

  if (section.lessons.length === 0) {
    return { kind: 'empty-section', course, sections, manifest, section } as const
  }

  const lesson = lessonId
    ? section.lessons.find((candidate) => candidate.id === lessonId)
    : section.lessons[0]
  if (!lesson) return { kind: 'lesson-not-found', course, sections, manifest, section } as const

  const contentEntries = await Promise.all(
    sections.flatMap((previewSection) =>
      previewSection.lessons.map(async (previewLesson) => {
        const content = await repository.getPreviewLesson(
          courseSlug,
          previewSection.id,
          previewLesson.id,
        )
        return [previewLesson.id, content] as const
      }),
    ),
  )
  const contentByLessonId = Object.fromEntries(
    contentEntries.filter(
      (entry): entry is readonly [string, PublicPreviewLessonContent] => entry[1] !== null,
    ),
  )
  const content = contentByLessonId[lesson.id]
  if (!content) {
    return { kind: 'content-missing', course, sections, manifest, section, lesson } as const
  }

  return {
    kind: 'available',
    course,
    sections,
    manifest,
    section,
    lesson,
    content,
    contentByLessonId,
  } as const
}
