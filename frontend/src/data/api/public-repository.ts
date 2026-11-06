import { apiRequest } from '@/lib/api/client'
import type {
  ApiCourseDetail,
  ApiCourseSummary,
  ApiPage,
  ApiPublicSiteSettings,
} from '@/lib/api/types'
import type { CourseDetailModel, CourseSummaryModel } from '@/domains/catalog/models'
import type { PublicCourseRepository } from '@/data/public-demo/types'

function mapSummary(course: ApiCourseSummary): CourseSummaryModel {
  return {
    id: course.id,
    code: course.code,
    slug: course.slug,
    title: course.title,
    level: course.level,
    shortDescription: course.shortDescription,
    ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
    priceVnd: course.price,
    accessDurationMonths: course.accessDurationMonths,
    status: course.status,
    chapterCount: course.chapterCount,
    lessonCount: course.lessonCount,
  }
}

function mapDetail(course: ApiCourseDetail): CourseDetailModel {
  return {
    ...mapSummary({
      id: course.id,
      code: course.code,
      slug: course.slug,
      title: course.title,
      level: course.level,
      shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnail?.url ?? course.banner?.url ?? null,
      price: course.price,
      accessDurationMonths: course.accessDurationMonths,
      status: 'PUBLISHED',
      chapterCount: course.sections.length,
      lessonCount: course.sections.reduce((sum, section) => sum + section.lessons.length, 0),
    }),
    description: course.description,
    objectives: course.objectives ?? [],
    requirements: course.requirements ?? [],
    sections: course.sections.map((section) => ({
      id: section.id,
      courseId: course.id,
      title: section.title,
      ...(section.description ? { description: section.description } : {}),
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: section.sortOrder,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.lessonType,
        contentStatus: 'PUBLISHED',
        ...(lesson.estimatedMinutes !== null ? { estimatedMinutes: lesson.estimatedMinutes } : {}),
        countsTowardProgress: true,
        progressStatus: 'NOT_STARTED',
      })),
    })),
  }
}

export const apiPublicRepository: PublicCourseRepository & {
  listCoursesPage(page: number, pageSize: number): Promise<ApiPage<CourseSummaryModel>>
  getPublicSiteSettings(): Promise<ApiPublicSiteSettings>
} = {
  async listCourses() {
    const page = await this.listCoursesPage(1, 100)
    return page.items
  },
  async listCoursesPage(page, pageSize) {
    const result = await apiRequest<ApiPage<ApiCourseSummary>>(
      `/courses?page=${page}&pageSize=${pageSize}`,
      { auth: false },
    )
    return { ...result, items: result.items.map(mapSummary) }
  },
  async getCourseBySlug(slug) {
    try {
      const course = await apiRequest<ApiCourseDetail>(`/courses/${encodeURIComponent(slug)}`, {
        auth: false,
      })
      return mapDetail(course)
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) return null
      throw error
    }
  },
  async getPreviewManifest() {
    return null
  },
  async getPreviewLesson() {
    return null
  },
  async getPublicSiteSettings() {
    return apiRequest<ApiPublicSiteSettings>('/site-settings/public', { auth: false })
  },
}
