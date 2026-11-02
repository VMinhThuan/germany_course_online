import type { MediaType } from '@/domains/contracts/backend-enums'

/** UI-safe, temporary media access. Canonical storage keys never cross this boundary. */
export interface MediaViewModel {
  id: string
  title: string
  mediaType: MediaType
  src?: string
  signedUrlExpiresAt?: string
  captionsSrc?: string
  transcript?: string
  canDownload: boolean
  availability: 'ready' | 'loading' | 'error' | 'unavailable'
  message?: string
}
