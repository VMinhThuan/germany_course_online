import { useQuery } from '@tanstack/react-query'
import { studentDemoRepositories } from './repository'

export function useStudentDashboard(sessionId: string) {
  return useQuery({
    queryKey: ['student', 'dashboard', sessionId],
    queryFn: () => studentDemoRepositories.student.getDashboard(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 0,
  })
}

export function useStudentCourses(sessionId: string) {
  return useQuery({
    queryKey: ['student', 'courses', sessionId],
    queryFn: () => studentDemoRepositories.student.listCourses(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 0,
  })
}
