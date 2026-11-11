import { apiRequest } from '@/lib/api/client'
import type {
  ApiAdminLessonComment,
  ApiAdminLessonCommentDetail,
  ApiAdminLessonCommentSummary,
  ApiLessonCommentCursorPage,
  ApiLessonCommentHistoryItem,
  ApiLessonCommentReactionType,
  ApiStudentLessonComment,
} from '@/lib/api/types'

type Query = Record<string, string | number | boolean | null | undefined>

function queryString(input: Query = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  return query.size ? `?${query.toString()}` : ''
}

const pathId = (id: string) => encodeURIComponent(id)

export const lessonCommentsRepository = {
  listLessonComments(
    lessonId: string,
    input: { limit?: number; cursor?: string; sort?: 'newest' | 'oldest' } = {},
  ) {
    return apiRequest<ApiLessonCommentCursorPage<ApiStudentLessonComment>>(
      `/learn/lessons/${pathId(lessonId)}/comments${queryString(input)}`,
    )
  },
  listReplies(commentId: string, input: { limit?: number; cursor?: string } = {}) {
    return apiRequest<ApiLessonCommentCursorPage<ApiStudentLessonComment>>(
      `/learn/comments/${pathId(commentId)}/replies${queryString(input)}`,
    )
  },
  createStudentComment(
    lessonId: string,
    input: { content: string; isAnonymous: boolean; parentId: string | null },
  ) {
    return apiRequest<ApiStudentLessonComment>(`/learn/lessons/${pathId(lessonId)}/comments`, {
      method: 'POST',
      body: input,
    })
  },
  editStudentComment(commentId: string, input: { content: string; expectedRevision: number }) {
    return apiRequest<ApiStudentLessonComment>(`/learn/comments/${pathId(commentId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deleteStudentComment(commentId: string) {
    return apiRequest<{ id: string; descendantsDeleted: number }>(
      `/learn/comments/${pathId(commentId)}`,
      {
        method: 'DELETE',
      },
    )
  },
  setStudentReaction(commentId: string, reactionType: ApiLessonCommentReactionType) {
    return apiRequest<{ reactionType: ApiLessonCommentReactionType | null }>(
      `/learn/comments/${pathId(commentId)}/reaction`,
      { method: 'PUT', body: { reactionType } },
    )
  },
  removeStudentReaction(commentId: string) {
    return apiRequest<{ reactionType: null }>(`/learn/comments/${pathId(commentId)}/reaction`, {
      method: 'DELETE',
    })
  },
  studentHistory(commentId: string) {
    return apiRequest<{ items: ApiLessonCommentHistoryItem[] }>(
      `/learn/comments/${pathId(commentId)}/history`,
    )
  },
  listAdminComments(input: Query = {}) {
    return apiRequest<{
      items: ApiAdminLessonComment[]
      page: number
      pageSize: number
      total: number
      hasMore: boolean
    }>(`/admin/lesson-comments${queryString(input)}`)
  },
  adminSummary() {
    return apiRequest<ApiAdminLessonCommentSummary>('/admin/lesson-comments/summary')
  },
  getAdminComment(commentId: string) {
    return apiRequest<ApiAdminLessonCommentDetail>(`/admin/lesson-comments/${pathId(commentId)}`)
  },
  createAdminComment(lessonId: string, input: { content: string; parentId: string | null }) {
    return apiRequest<ApiAdminLessonComment>(`/admin/lessons/${pathId(lessonId)}/comments`, {
      method: 'POST',
      body: { ...input, isAnonymous: false },
    })
  },
  editAdminComment(
    commentId: string,
    input: { content: string; expectedRevision: number; reason?: string },
  ) {
    return apiRequest<ApiAdminLessonComment>(`/admin/lesson-comments/${pathId(commentId)}`, {
      method: 'PATCH',
      body: input,
    })
  },
  deleteAdminComment(commentId: string, reason?: string) {
    return apiRequest<{ id: string; descendantsDeleted: number }>(
      `/admin/lesson-comments/${pathId(commentId)}`,
      {
        method: 'DELETE',
        body: reason ? { reason } : {},
      },
    )
  },
  setAdminReaction(commentId: string, reactionType: ApiLessonCommentReactionType) {
    return apiRequest<{ reactionType: ApiLessonCommentReactionType | null }>(
      `/admin/lesson-comments/${pathId(commentId)}/reaction`,
      { method: 'PUT', body: { reactionType } },
    )
  },
  removeAdminReaction(commentId: string) {
    return apiRequest<{ reactionType: null }>(
      `/admin/lesson-comments/${pathId(commentId)}/reaction`,
      {
        method: 'DELETE',
      },
    )
  },
  adminHistory(commentId: string) {
    return apiRequest<ApiLessonCommentHistoryItem[]>(
      `/admin/lesson-comments/${pathId(commentId)}/history`,
    )
  },
}
