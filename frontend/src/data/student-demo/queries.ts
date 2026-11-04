import { useQuery } from '@tanstack/react-query'
import { apiStudentRepositories } from '@/data/api/student-repository'

export function useStudentDashboard(sessionId: string) {
  return useQuery({
    queryKey: ['student', 'dashboard', sessionId],
    queryFn: () => apiStudentRepositories.student.getDashboard(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 0,
  })
}

export function useStudentCourses(sessionId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['student', 'courses', sessionId, page, pageSize],
    queryFn: () => apiStudentRepositories.student.listCoursesPage(page, pageSize),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 0,
  })
}
