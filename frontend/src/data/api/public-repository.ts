import { apiRequest } from '@/lib/api/client'
import type {
  ApiCourseDetail,
  ApiCourseSummary,
  ApiPage,
  ApiPublicSiteSettings,
  ApiPreviewLesson,
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
    ...(course.previewChapterCount !== undefined
      ? { previewChapterCount: course.previewChapterCount }
      : {}),
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
      previewChapterCount: course.previewChapterCount,
      status: 'PUBLISHED',
      chapterCount: course.sections.filter((section) => section.sectionType === 'CHAPTER').length,
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
      sectionType: section.sectionType,
      contentStatus: 'PUBLISHED',
      sortOrder: section.sortOrder,
      isPreview: section.isPreview,
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
  async getPreviewManifest(slug) {
    const course = await apiRequest<ApiCourseDetail>(`/courses/${encodeURIComponent(slug)}`, {
      auth: false,
    })
    const sectionIds = course.sections
      .filter((section) => section.isPreview)
      .map((section) => section.id)
    if (sectionIds.length === 0) return null
    return {
      courseSlug: slug,
      sectionIds,
      notice: `${sectionIds.length} chương đầu được mở miễn phí. Các chương còn lại cần đăng ký khóa học.`,
    }
  },
  async getPreviewLesson(slug, sectionId, lessonId) {
    return apiRequest<ApiPreviewLesson>(
      `/courses/${encodeURIComponent(slug)}/preview/lessons/${encodeURIComponent(lessonId)}?sectionId=${encodeURIComponent(sectionId)}`,
      { auth: false },
    ).then((lesson) => ({
      courseSlug: lesson.courseSlug,
      sectionId: lesson.sectionId,
      lessonId: lesson.lessonId,
      paragraphs: lesson.paragraphs,
      keyPhrases: [],
      video: lesson.video,
      media: [],
      exercises: lesson.exercises.map((exercise) => ({
        id: exercise.id,
        lessonId: exercise.lessonId,
        title: exercise.title,
        ...(exercise.description ? { description: exercise.description } : {}),
        instructions: exercise.instructions,
        exerciseType: exercise.exerciseType,
        completionMode: exercise.completionMode,
        isRequired: exercise.isRequired,
        sortOrder: exercise.sortOrder,
        assets: (exercise.assets ?? []).map((asset) => ({
          id: asset.id,
          title: asset.title ?? asset.role,
          role: asset.role,
          mediaType: asset.mediaType,
          ...(asset.url ? { src: asset.url } : {}),
          canDownload: Boolean(asset.url),
          availability: asset.url ? ('ready' as const) : ('unavailable' as const),
        })),
      })),
    }))
  },
  async getPublicSiteSettings() {
    return apiRequest<ApiPublicSiteSettings>('/site-settings/public', { auth: false })
  },
}
