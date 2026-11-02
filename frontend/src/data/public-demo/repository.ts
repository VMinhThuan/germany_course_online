import { PUBLIC_DEMO_COURSE, PUBLIC_PREVIEW_LESSONS, PUBLIC_PREVIEW_MANIFEST } from './fixtures'
import type { PublicCourseRepository } from './types'

export interface PublicDemoRepositoryOptions {
  latencyMs?: number
}

export function createPublicDemoRepository(
  options: PublicDemoRepositoryOptions = {},
): PublicCourseRepository {
  const latencyMs = Math.max(0, options.latencyMs ?? 0)
  const wait = async () => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
  }

  return {
    async listCourses() {
      await wait()
      const course = PUBLIC_DEMO_COURSE
      return [
        {
          id: course.id,
          code: course.code,
          slug: course.slug,
          title: course.title,
          level: course.level,
          shortDescription: course.shortDescription,
          ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
          ...(course.priceVnd !== undefined ? { priceVnd: course.priceVnd } : {}),
          ...(course.accessDurationMonths !== undefined
            ? { accessDurationMonths: course.accessDurationMonths }
            : {}),
          status: course.status,
          ...(course.chapterCount !== undefined ? { chapterCount: course.chapterCount } : {}),
          ...(course.lessonCount !== undefined ? { lessonCount: course.lessonCount } : {}),
        },
      ]
    },
    async getCourseBySlug(slug) {
      await wait()
      return slug === PUBLIC_DEMO_COURSE.slug ? structuredClone(PUBLIC_DEMO_COURSE) : null
    },
    async getPreviewManifest(courseSlug) {
      await wait()
      return courseSlug === PUBLIC_PREVIEW_MANIFEST.courseSlug
        ? structuredClone(PUBLIC_PREVIEW_MANIFEST)
        : null
    },
    async getPreviewLesson(courseSlug, sectionId, lessonId) {
      await wait()
      if (
        courseSlug !== PUBLIC_PREVIEW_MANIFEST.courseSlug ||
        !PUBLIC_PREVIEW_MANIFEST.sectionIds.includes(sectionId)
      ) {
        return null
      }
      const content = PUBLIC_PREVIEW_LESSONS.find(
        (lesson) =>
          lesson.courseSlug === courseSlug &&
          lesson.sectionId === sectionId &&
          lesson.lessonId === lessonId,
      )
      return content ? structuredClone(content) : null
    },
  }
}

export const publicDemoRepository = createPublicDemoRepository({ latencyMs: 180 })
