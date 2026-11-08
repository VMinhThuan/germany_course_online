import type { QuizAttemptStatus, QuestionType } from '@/domains/contracts/backend-enums'

export interface QuizOptionViewModel {
  id: string
  label: string
}

export interface QuizQuestionViewModel {
  id: string
  prompt: string
  questionType: QuestionType
  options: readonly QuizOptionViewModel[]
}

/** Start/attempt view model deliberately has no correct-answer properties. */
export interface QuizAttemptViewModel {
  id: string
  status: QuizAttemptStatus
  questions: readonly QuizQuestionViewModel[]
  selectedAnswers: Readonly<Record<string, string | undefined>>
  capabilities: { canSubmit: boolean }
}

export interface QuizReviewItemViewModel {
  questionId: string
  prompt: string
  isCorrect: boolean
  selectedOptionId?: string
  selectedOption?: string
  correctOptionId?: string
  correctOption?: string
  explanation?: string
}

export interface QuizResultViewModel {
  attemptId: string
  score?: string
  maxScore?: string
  correctCount?: number
  totalQuestions: number
  passed?: boolean | null
  review?: readonly QuizReviewItemViewModel[]
  capabilities: { canReviewAnswers: boolean; canRetry: boolean }
}
