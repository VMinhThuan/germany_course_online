import { useQuery } from '@tanstack/react-query'
import { apiPublicRepository } from '@/data/api/public-repository'
import { loadPreviewExperience } from './use-cases'
import type { PublicCourseRepository } from './types'

export function usePublicCourseCatalog(repository: PublicCourseRepository = apiPublicRepository) {
  return useQuery({
    queryKey: ['public', 'courses'],
    queryFn: () => repository.listCourses(),
    retry: false,
  })
}

export function usePublicCourseCatalogPage(page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ['public', 'courses', page, pageSize],
    queryFn: () => apiPublicRepository.listCoursesPage(page, pageSize),
    retry: false,
  })
}

export function usePublicCourse(
  slug: string,
  repository: PublicCourseRepository = apiPublicRepository,
) {
  return useQuery({
    queryKey: ['public', 'course', slug],
    queryFn: () => repository.getCourseBySlug(slug),
    retry: false,
  })
}

export function usePublicPreviewManifest(
  slug: string,
  repository: PublicCourseRepository = apiPublicRepository,
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
  repository: PublicCourseRepository = apiPublicRepository,
) {
  return useQuery({
    queryKey: ['public-demo', 'preview', slug, sectionId ?? null, lessonId ?? null],
    queryFn: () => loadPreviewExperience(repository, slug, sectionId, lessonId),
    retry: false,
  })
}

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: ['public', 'site-settings'],
    queryFn: () => apiPublicRepository.getPublicSiteSettings(),
    retry: false,
  })
}
