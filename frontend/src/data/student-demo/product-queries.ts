import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studentDemoRepositories } from './repository'

const root = (sessionId: string) => ['student', sessionId] as const

function useProductMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: ['student'] }),
  })
}

export function useProductCourse(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'course', courseId],
    queryFn: () => studentDemoRepositories.learning.getCourseOverview(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}

export function useProductSection(sessionId: string, courseId: string, sectionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'section', courseId, sectionId],
    queryFn: () => studentDemoRepositories.learning.getSection(sessionId, courseId, sectionId),
    enabled: Boolean(sessionId && courseId && sectionId),
    retry: false,
  })
}

export function useProductLesson(sessionId: string, lessonId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'lesson', lessonId],
    queryFn: () => studentDemoRepositories.learning.getLesson(sessionId, lessonId),
    enabled: Boolean(sessionId && lessonId),
    retry: false,
  })
}

export function useProductExercise(sessionId: string, exerciseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'exercise', exerciseId],
    queryFn: () => studentDemoRepositories.learning.getExercise(sessionId, exerciseId),
    enabled: Boolean(sessionId && exerciseId),
    retry: false,
  })
}

export function useProductQuizAttempt(sessionId: string, attemptId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'quiz', attemptId],
    queryFn: () => studentDemoRepositories.learning.getQuizAttempt(sessionId, attemptId),
    enabled: Boolean(sessionId && attemptId),
    retry: false,
  })
}

export function useProductQuizResult(sessionId: string, attemptId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'quiz-result', attemptId],
    queryFn: () => studentDemoRepositories.learning.getQuizResult(sessionId, attemptId),
    enabled: Boolean(sessionId && attemptId),
    retry: false,
  })
}

export function useProductProgress(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'progress', courseId],
    queryFn: () => studentDemoRepositories.learning.getProgress(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}

export function useProductLessonNote(sessionId: string, lessonId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'note', lessonId],
    queryFn: () => studentDemoRepositories.learning.getLessonNote(sessionId, lessonId),
    enabled: Boolean(sessionId && lessonId),
    retry: false,
  })
}

export function useProductCheckout(
  sessionId: string,
  context: string,
  planId?: string,
  couponCode?: string,
) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'checkout', context, planId ?? '', couponCode ?? ''],
    queryFn: () =>
      studentDemoRepositories.commerce.getCheckoutContext(sessionId, context, planId, couponCode),
    enabled: Boolean(sessionId && context),
    placeholderData: (previousQuote) => previousQuote,
    retry: false,
  })
}

export function useProductRenewalPlans(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'renewal-plans', courseId],
    queryFn: () => studentDemoRepositories.commerce.getRenewalPlans(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}

export function useProductOrders(sessionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'orders'],
    queryFn: () => studentDemoRepositories.commerce.listOrders(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  })
}

export function useProductOrder(sessionId: string, orderId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'order', orderId],
    queryFn: () => studentDemoRepositories.commerce.getOrder(sessionId, orderId),
    enabled: Boolean(sessionId && orderId),
    retry: false,
  })
}

export function useProductProfile(sessionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'account', 'profile'],
    queryFn: () => studentDemoRepositories.account.getProfile(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  })
}

export function useProductSessions(sessionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'account', 'sessions'],
    queryFn: () => studentDemoRepositories.account.listSessions(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  })
}

export function useCompleteExercise(sessionId: string) {
  return useProductMutation((exerciseId: string) =>
    studentDemoRepositories.learning.completeExercise(sessionId, exerciseId),
  )
}

export function useStartQuiz(sessionId: string) {
  return useProductMutation((exerciseId: string) =>
    studentDemoRepositories.learning.startQuiz(sessionId, exerciseId),
  )
}

export function useSelectQuizAnswer(sessionId: string, attemptId: string) {
  return useProductMutation((input: { questionId: string; optionId: string }) =>
    studentDemoRepositories.learning.selectQuizAnswer(
      sessionId,
      attemptId,
      input.questionId,
      input.optionId,
    ),
  )
}

export function useSubmitQuiz(sessionId: string, attemptId: string) {
  return useProductMutation(() => studentDemoRepositories.learning.submitQuiz(sessionId, attemptId))
}

export function useRetryQuiz(sessionId: string) {
  return useProductMutation((attemptId: string) =>
    studentDemoRepositories.learning.retryQuiz(sessionId, attemptId),
  )
}

export function useCompleteLesson(sessionId: string) {
  return useProductMutation((lessonId: string) =>
    studentDemoRepositories.learning.completeLesson(sessionId, lessonId),
  )
}

export function useSaveLessonNote(sessionId: string, lessonId: string) {
  return useProductMutation((note: string) =>
    studentDemoRepositories.learning.saveLessonNote(sessionId, lessonId, note),
  )
}

export function useCreateOrder(sessionId: string) {
  return useProductMutation((input: { context: string; couponCode?: string; planId?: string }) =>
    studentDemoRepositories.commerce.createOrder(sessionId, input.context, {
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      ...(input.planId ? { planId: input.planId } : {}),
    }),
  )
}

export function useSimulatePayment(sessionId: string) {
  return useProductMutation((input: { orderId: string; outcome: 'success' | 'failure' }) =>
    studentDemoRepositories.commerce.simulateDemoPayment(sessionId, input.orderId, input.outcome),
  )
}

export function useUpdateProfile(sessionId: string) {
  return useProductMutation((displayName: string) =>
    studentDemoRepositories.account.updateProfile(sessionId, { displayName }),
  )
}

export function useChangeDemoPassword(sessionId: string) {
  return useProductMutation((input: { currentPassword: string; newPassword: string }) =>
    studentDemoRepositories.account.changePassword(
      sessionId,
      input.currentPassword,
      input.newPassword,
    ),
  )
}

export function useRevokeDemoSession(sessionId: string) {
  return useProductMutation((targetSessionId: string) =>
    studentDemoRepositories.account.revokeSession(sessionId, targetSessionId),
  )
}
