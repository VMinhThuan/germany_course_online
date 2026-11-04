import { apiRequest, uploadWithProgress } from '@/lib/api/client'
import type {
  ApiAdminCourse,
  ApiAdminEnrollment,
  ApiAdminEnrollmentDetail,
  ApiAdminExercise,
  ApiAdminLesson,
  ApiAdminMediaAsset,
  ApiAdminOrderDetail,
  ApiAdminOrderSummary,
  ApiAdminQuiz,
  ApiAdminSection,
  ApiAdminSiteSettings,
  ApiAdminStudent,
  ApiAdminStudentDetail,
  ApiAuditLog,
  ApiAssetAssociation,
  ApiAdminCoupon,
  ApiMediaUploadIntent,
  ApiPage,
  ApiRenewalPlan,
} from '@/lib/api/types'

type Query = Record<string, string | number | boolean | null | undefined>

function queryString(input: Query = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  return query.size ? `?${query.toString()}` : ''
}

function idempotent(key: string | undefined) {
  return key ? { idempotencyKey: key } : {}
}

const pathId = (id: string) => encodeURIComponent(id)

export const adminRepository = {
  listCourses(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminCourse>>(
      `/admin/courses${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  getCourse(courseId: string) {
    return apiRequest<ApiAdminCourse>(`/admin/courses/${pathId(courseId)}`)
  },
  createCourse(input: Record<string, unknown>, key: string) {
    return apiRequest<ApiAdminCourse>('/admin/courses', {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  updateCourse(courseId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminCourse>(`/admin/courses/${pathId(courseId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  publishCourse(courseId: string) {
    return apiRequest<ApiAdminCourse>(`/admin/courses/${pathId(courseId)}/publish`, {
      method: 'POST',
    })
  },
  deleteCourse(courseId: string) {
    return apiRequest<void>(`/admin/courses/${pathId(courseId)}`, { method: 'DELETE' })
  },
  listSections(courseId: string, filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminSection>>(
      `/admin/courses/${pathId(courseId)}/sections${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createSection(courseId: string, input: Record<string, unknown>, key: string) {
    return apiRequest<ApiAdminSection>(`/admin/courses/${pathId(courseId)}/sections`, {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  updateSection(sectionId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminSection>(`/admin/sections/${pathId(sectionId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deleteSection(sectionId: string) {
    return apiRequest<void>(`/admin/sections/${pathId(sectionId)}`, { method: 'DELETE' })
  },
  listLessons(sectionId: string, filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminLesson>>(
      `/admin/sections/${pathId(sectionId)}/lessons${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createLesson(sectionId: string, input: Record<string, unknown>, key: string) {
    return apiRequest<ApiAdminLesson>(`/admin/sections/${pathId(sectionId)}/lessons`, {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  updateLesson(lessonId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminLesson>(`/admin/lessons/${pathId(lessonId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deleteLesson(lessonId: string) {
    return apiRequest<void>(`/admin/lessons/${pathId(lessonId)}`, { method: 'DELETE' })
  },
  listExercises(lessonId: string, filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminExercise>>(
      `/admin/lessons/${pathId(lessonId)}/exercises${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createExercise(lessonId: string, input: Record<string, unknown>, key: string) {
    return apiRequest<ApiAdminExercise>(`/admin/lessons/${pathId(lessonId)}/exercises`, {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  updateExercise(exerciseId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminExercise>(`/admin/exercises/${pathId(exerciseId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deleteExercise(exerciseId: string) {
    return apiRequest<void>(`/admin/exercises/${pathId(exerciseId)}`, { method: 'DELETE' })
  },
  getQuiz(exerciseId: string) {
    return apiRequest<ApiAdminQuiz>(`/admin/exercises/${pathId(exerciseId)}/quiz`)
  },
  saveQuiz(exerciseId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminQuiz>(`/admin/exercises/${pathId(exerciseId)}/quiz`, {
      method: 'PUT',
      body: input,
    })
  },
  listStudents(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminStudent>>(
      `/admin/students${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  getStudent(userId: string) {
    return apiRequest<ApiAdminStudentDetail>(`/admin/students/${pathId(userId)}`)
  },
  setStudentStatus(userId: string, status: 'ACTIVE' | 'BLOCKED') {
    return apiRequest<ApiAdminStudent>(`/admin/students/${pathId(userId)}/status`, {
      method: 'PATCH',
      body: { status },
    })
  },
  listEnrollments(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminEnrollment>>(
      `/admin/enrollments${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  getEnrollment(enrollmentId: string) {
    return apiRequest<ApiAdminEnrollmentDetail>(`/admin/enrollments/${pathId(enrollmentId)}`)
  },
  grantEnrollment(
    input: { userId: string; courseId: string; durationMonths: number; reason: string },
    key: string,
  ) {
    return apiRequest<ApiAdminEnrollmentDetail>('/admin/enrollments', {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  revokeEnrollment(enrollmentId: string, reason: string, key: string) {
    return apiRequest<ApiAdminEnrollmentDetail>(
      `/admin/enrollments/${pathId(enrollmentId)}/revoke`,
      { method: 'POST', body: { reason }, ...idempotent(key) },
    )
  },
  extendEnrollment(
    enrollmentId: string,
    input: { durationMonths: number; reason: string },
    key: string,
  ) {
    return apiRequest<ApiAdminEnrollmentDetail>(
      `/admin/enrollments/${pathId(enrollmentId)}/extend`,
      { method: 'POST', body: input, ...idempotent(key) },
    )
  },
  restoreEnrollment(
    enrollmentId: string,
    input: { reason: string; extensionMonths?: number },
    key: string,
  ) {
    return apiRequest<ApiAdminEnrollmentDetail>(
      `/admin/enrollments/${pathId(enrollmentId)}/restore`,
      { method: 'POST', body: input, ...idempotent(key) },
    )
  },
  listRenewalPlans(courseId: string, filters: Query = {}) {
    return apiRequest<ApiPage<ApiRenewalPlan>>(
      `/admin/courses/${pathId(courseId)}/renewal-plans${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createRenewalPlan(courseId: string, input: Record<string, unknown>, key: string) {
    return apiRequest<ApiRenewalPlan>(`/admin/courses/${pathId(courseId)}/renewal-plans`, {
      method: 'POST',
      body: input,
      ...idempotent(key),
    })
  },
  updateRenewalPlan(planId: string, input: Record<string, unknown>) {
    return apiRequest<ApiRenewalPlan>(`/admin/renewal-plans/${pathId(planId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deactivateRenewalPlan(planId: string) {
    return apiRequest<void>(`/admin/renewal-plans/${pathId(planId)}`, { method: 'DELETE' })
  },
  listCoupons(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminCoupon>>(
      `/admin/coupons${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createCoupon(input: Record<string, unknown>) {
    return apiRequest<ApiAdminCoupon>('/admin/coupons', { method: 'POST', body: input })
  },
  updateCoupon(couponId: string, input: Record<string, unknown>) {
    return apiRequest<ApiAdminCoupon>(`/admin/coupons/${pathId(couponId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deactivateCoupon(couponId: string) {
    return apiRequest<void>(`/admin/coupons/${pathId(couponId)}`, { method: 'DELETE' })
  },
  listOrders(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminOrderSummary>>(
      `/admin/orders${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  getOrder(orderId: string) {
    return apiRequest<ApiAdminOrderDetail>(`/admin/orders/${pathId(orderId)}`)
  },
  approveOrder(orderId: string, reviewNote: string) {
    return apiRequest<ApiAdminOrderDetail>(`/admin/orders/${pathId(orderId)}/approve`, {
      method: 'POST',
      body: { reviewNote },
    })
  },
  cancelOrder(
    orderId: string,
    input: {
      reason: string
      reconciliationOutcome: 'NO_FUNDS_RECEIVED' | 'REFUND_CONFIRMED_EXTERNALLY'
    },
  ) {
    return apiRequest<ApiAdminOrderDetail>(`/admin/orders/${pathId(orderId)}/cancel`, {
      method: 'POST',
      body: input,
    })
  },
  getSiteSettings() {
    return apiRequest<ApiAdminSiteSettings>('/admin/site-settings')
  },
  updateSiteSettings(input: Record<string, unknown>) {
    return apiRequest<ApiAdminSiteSettings>('/admin/site-settings', {
      method: 'PATCH',
      body: input,
    })
  },
  listAuditLogs(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAuditLog>>(
      `/admin/audit-logs${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  listMedia(filters: Query = {}) {
    return apiRequest<ApiPage<ApiAdminMediaAsset>>(
      `/admin/media-assets${queryString({ page: 1, pageSize: 100, ...filters })}`,
    )
  },
  createUploadIntent(input: {
    originalName: string
    mediaType: string
    mimeType: string
    fileSize: number
    visibility: 'PUBLIC' | 'ENROLLED'
  }) {
    return apiRequest<ApiMediaUploadIntent>('/admin/media-assets/upload-intents', {
      method: 'POST',
      body: input,
    })
  },
  uploadFile(url: string, file: File, onProgress: (percent: number) => void, signal?: AbortSignal) {
    return uploadWithProgress(url, file, onProgress, signal)
  },
  completeUpload(assetId: string, providerUploadId?: string) {
    return apiRequest<ApiAdminMediaAsset>(
      `/admin/media-assets/${pathId(assetId)}/complete-upload`,
      {
        method: 'POST',
        body: providerUploadId ? { providerUploadId } : {},
      },
    )
  },
  deleteMedia(assetId: string) {
    return apiRequest<void>(`/admin/media-assets/${pathId(assetId)}`, { method: 'DELETE' })
  },
  listLessonAssets(lessonId: string) {
    return apiRequest<{ items: ApiAssetAssociation[] }>(`/admin/lessons/${pathId(lessonId)}/assets`)
  },
  linkLessonAsset(
    lessonId: string,
    assetId: string,
    input: { assetRole: string; title: string | null; sortOrder: number },
  ) {
    return apiRequest<ApiAssetAssociation>(
      `/admin/lessons/${pathId(lessonId)}/assets/${pathId(assetId)}`,
      { method: 'PUT', body: input },
    )
  },
  unlinkLessonAsset(lessonId: string, assetId: string, assetRole: string) {
    return apiRequest<void>(
      `/admin/lessons/${pathId(lessonId)}/assets/${pathId(assetId)}?assetRole=${encodeURIComponent(assetRole)}`,
      { method: 'DELETE' },
    )
  },
  listExerciseAssets(exerciseId: string) {
    return apiRequest<{ items: ApiAssetAssociation[] }>(
      `/admin/exercises/${pathId(exerciseId)}/assets`,
    )
  },
  linkExerciseAsset(
    exerciseId: string,
    assetId: string,
    input: { assetRole: string; title: string | null; sortOrder: number },
  ) {
    return apiRequest<ApiAssetAssociation>(
      `/admin/exercises/${pathId(exerciseId)}/assets/${pathId(assetId)}`,
      { method: 'PUT', body: input },
    )
  },
  unlinkExerciseAsset(exerciseId: string, assetId: string, assetRole: string) {
    return apiRequest<void>(
      `/admin/exercises/${pathId(exerciseId)}/assets/${pathId(assetId)}?assetRole=${encodeURIComponent(assetRole)}`,
      { method: 'DELETE' },
    )
  },
}
