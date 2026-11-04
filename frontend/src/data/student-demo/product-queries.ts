import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { apiStudentRepositories } from '@/data/api/student-repository'

const root = (sessionId: string) => ['student', sessionId] as const
function newKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function useProductMutation<TInput, TOutput>(
  sessionId: string,
  mutationFn: (input: TInput) => Promise<TOutput>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: root(sessionId) }),
        client.invalidateQueries({ queryKey: ['student', 'dashboard', sessionId] }),
        client.invalidateQueries({ queryKey: ['student', 'courses', sessionId] }),
      ])
    },
  })
}

export function useProductCourse(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'course', courseId],
    queryFn: () => apiStudentRepositories.learning.getCourseOverview(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}
export function useProductSection(sessionId: string, courseId: string, sectionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'section', courseId, sectionId],
    queryFn: () => apiStudentRepositories.learning.getSection(sessionId, courseId, sectionId),
    enabled: Boolean(sessionId && courseId && sectionId),
    retry: false,
  })
}
export function useProductLesson(sessionId: string, lessonId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'lesson', lessonId],
    queryFn: () => apiStudentRepositories.learning.getLesson(sessionId, lessonId),
    enabled: Boolean(sessionId && lessonId),
    retry: false,
  })
}
export function useProductExercise(sessionId: string, exerciseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'exercise', exerciseId],
    queryFn: () => apiStudentRepositories.learning.getExercise(sessionId, exerciseId),
    enabled: Boolean(sessionId && exerciseId),
    retry: false,
  })
}
export function useProductQuizAttempt(sessionId: string, attemptId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'quiz', attemptId],
    queryFn: () => apiStudentRepositories.learning.getQuizAttempt(sessionId, attemptId),
    enabled: Boolean(sessionId && attemptId),
    retry: false,
  })
}
export function useProductQuizResult(sessionId: string, attemptId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'quiz-result', attemptId],
    queryFn: () => apiStudentRepositories.learning.getQuizResult(sessionId, attemptId),
    enabled: Boolean(sessionId && attemptId),
    retry: false,
  })
}
export function useProductProgress(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'progress', courseId],
    queryFn: () => apiStudentRepositories.learning.getProgress(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}
export function useProductLessonNote(sessionId: string, lessonId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'learning', 'note', lessonId],
    queryFn: () => apiStudentRepositories.learning.getLessonNote(sessionId, lessonId),
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
      apiStudentRepositories.commerce.getCheckoutContext(sessionId, context, planId, couponCode),
    enabled: Boolean(sessionId && context),
    placeholderData: (previousQuote) => previousQuote,
    retry: false,
  })
}
export function useProductRenewalPlans(sessionId: string, courseId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'renewal-plans', courseId],
    queryFn: () => apiStudentRepositories.commerce.getRenewalPlans(sessionId, courseId),
    enabled: Boolean(sessionId && courseId),
    retry: false,
  })
}
export function useValidateStudentCoupon(sessionId: string) {
  return useMutation({
    mutationFn: (input: { context: string; code: string; planId?: string }) =>
      apiStudentRepositories.commerce.validateCoupon(
        sessionId,
        input.context,
        input.code,
        input.planId,
      ),
  })
}
export function useProductOrders(sessionId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'orders', page, pageSize],
    queryFn: () => apiStudentRepositories.commerce.listOrdersPage(page, pageSize),
    enabled: Boolean(sessionId),
    retry: false,
  })
}
export function useProductOrder(sessionId: string, orderId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'commerce', 'order', orderId],
    queryFn: () => apiStudentRepositories.commerce.getOrder(sessionId, orderId),
    enabled: Boolean(sessionId && orderId),
    retry: false,
  })
}
export function useProductProfile(sessionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'account', 'profile'],
    queryFn: () => apiStudentRepositories.account.getProfile(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  })
}
export function useProductSessions(sessionId: string) {
  return useQuery({
    queryKey: [...root(sessionId), 'account', 'sessions'],
    queryFn: () => apiStudentRepositories.account.listSessions(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  })
}

export function useCompleteExercise(sessionId: string) {
  return useProductMutation(sessionId, (id: string) =>
    apiStudentRepositories.learning.completeExercise(sessionId, id),
  )
}
export function useStartQuiz(sessionId: string) {
  const keys = useRef(new Map<string, string>())
  const mutation = useProductMutation(sessionId, (exerciseId: string) => {
    const key = keys.current.get(exerciseId) ?? newKey()
    keys.current.set(exerciseId, key)
    return apiStudentRepositories.learning.startQuiz(sessionId, exerciseId, key)
  })
  const onSuccess = mutation.mutateAsync
  return {
    ...mutation,
    mutateAsync: async (exerciseId: string) => {
      const result = await onSuccess(exerciseId)
      keys.current.delete(exerciseId)
      return result
    },
  }
}
export function useSelectQuizAnswer(sessionId: string, attemptId: string) {
  return useProductMutation(sessionId, (input: { questionId: string; optionId: string }) =>
    apiStudentRepositories.learning.selectQuizAnswer(
      sessionId,
      attemptId,
      input.questionId,
      input.optionId,
    ),
  )
}
export function useSubmitQuiz(sessionId: string, attemptId: string) {
  return useProductMutation(sessionId, () =>
    apiStudentRepositories.learning.submitQuiz(sessionId, attemptId),
  )
}
export function useRetryQuiz(sessionId: string) {
  const keys = useRef(new Map<string, string>())
  const mutation = useProductMutation(sessionId, (attemptId: string) => {
    const key = keys.current.get(attemptId) ?? newKey()
    keys.current.set(attemptId, key)
    return apiStudentRepositories.learning.retryQuiz(sessionId, attemptId, key)
  })
  const onSuccess = mutation.mutateAsync
  return {
    ...mutation,
    mutateAsync: async (attemptId: string) => {
      const result = await onSuccess(attemptId)
      keys.current.delete(attemptId)
      return result
    },
  }
}
export function useCompleteLesson(sessionId: string) {
  return useProductMutation(sessionId, (id: string) =>
    apiStudentRepositories.learning.completeLesson(sessionId, id),
  )
}
export function useSaveLessonNote(sessionId: string, lessonId: string) {
  return useProductMutation(sessionId, (note: string) =>
    apiStudentRepositories.learning.saveLessonNote(sessionId, lessonId, note),
  )
}
export function useCreateOrder(sessionId: string) {
  const keyState = useRef<{ scope: string; key: string } | null>(null)
  const mutation = useProductMutation(
    sessionId,
    (input: { context: string; couponCode?: string; planId?: string }) => {
      const scope = JSON.stringify(input)
      if (keyState.current?.scope !== scope) keyState.current = { scope, key: newKey() }
      return apiStudentRepositories.commerce.createOrder(sessionId, input.context, {
        ...(input.couponCode ? { couponCode: input.couponCode } : {}),
        ...(input.planId ? { planId: input.planId } : {}),
        idempotencyKey: keyState.current.key,
      })
    },
  )
  const onSuccess = mutation.mutateAsync
  return {
    ...mutation,
    mutateAsync: async (input: { context: string; couponCode?: string; planId?: string }) => {
      const result = await onSuccess(input)
      keyState.current = null
      return result
    },
  }
}
export function useConfirmTransfer(sessionId: string) {
  return useProductMutation(sessionId, (orderId: string) =>
    apiStudentRepositories.commerce.confirmTransfer!(sessionId, orderId),
  )
}
export function useCancelStudentOrder(sessionId: string) {
  return useProductMutation(sessionId, (orderId: string) =>
    apiStudentRepositories.commerce.cancelOrder!(sessionId, orderId),
  )
}
export function useUpdateProfile(sessionId: string) {
  return useProductMutation(sessionId, (displayName: string) =>
    apiStudentRepositories.account.updateProfile(sessionId, { displayName }),
  )
}
export function useChangePassword(sessionId: string) {
  return useProductMutation(sessionId, (input: { currentPassword: string; newPassword: string }) =>
    apiStudentRepositories.account.changePassword(
      sessionId,
      input.currentPassword,
      input.newPassword,
    ),
  )
}
export function useRevokeSession(sessionId: string) {
  return useProductMutation(sessionId, (targetSessionId: string) =>
    apiStudentRepositories.account.revokeSession(sessionId, targetSessionId),
  )
}
