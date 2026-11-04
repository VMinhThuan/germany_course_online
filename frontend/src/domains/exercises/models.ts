import type {
  CompletionMode,
  ExerciseAssetRole,
  ExerciseType,
  ProgressStatus,
} from '@/domains/contracts/backend-enums'

export interface ExerciseAssetViewModel {
  id: string
  title: string
  role: ExerciseAssetRole
  src?: string
  canDownload: boolean
  availability?: 'ready' | 'loading' | 'error' | 'unavailable'
  message?: string
}

export interface ExerciseViewModel {
  id: string
  lessonId?: string
  title: string
  description?: string
  instructions: string
  exerciseType: ExerciseType
  completionMode: CompletionMode
  isRequired: boolean
  status: ProgressStatus
  assets: readonly ExerciseAssetViewModel[]
  capabilities: {
    canMarkComplete: boolean
    canViewSolutions: boolean
  }
}
