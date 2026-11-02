import { useQuery } from '@tanstack/react-query'
import { publicDemoRepository } from './repository'
import { loadPreviewExperience } from './use-cases'
import type { PublicCourseRepository } from './types'

export function usePublicCourseCatalog(repository: PublicCourseRepository = publicDemoRepository) {
  return useQuery({
    queryKey: ['public-demo', 'course-catalog'],
    queryFn: () => repository.listCourses(),
    retry: false,
  })
}

export function usePublicCourse(
  slug: string,
  repository: PublicCourseRepository = publicDemoRepository,
) {
  return useQuery({
    queryKey: ['public-demo', 'course', slug],
    queryFn: () => repository.getCourseBySlug(slug),
    retry: false,
  })
}

export function usePublicPreviewManifest(
  slug: string,
  repository: PublicCourseRepository = publicDemoRepository,
) {
  return useQuery({
    queryKey: ['public-demo', 'preview-manifest', slug],
    queryFn: () => repository.getPreviewManifest(slug),
    retry: false,
  })
}

export function usePreviewExperience(
  slug: string,
  sectionId?: string,
  lessonId?: string,
  repository: PublicCourseRepository = publicDemoRepository,
) {
  return useQuery({
    queryKey: ['public-demo', 'preview', slug, sectionId ?? null, lessonId ?? null],
    queryFn: () => loadPreviewExperience(repository, slug, sectionId, lessonId),
    retry: false,
  })
}
