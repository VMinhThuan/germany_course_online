import { adminRepository } from '@/data/api/admin-repository'
import type { ApiMediaCapabilities } from '@/lib/api/types'

export type AdminMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'

const extensionMime: Record<AdminMediaType, Record<string, string>> = {
  IMAGE: {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  },
  VIDEO: { mp4: 'video/mp4' },
  AUDIO: {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    wav: 'audio/wav',
    wave: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
  },
  PDF: { pdf: 'application/pdf' },
}

const maxBytes: Record<AdminMediaType, number> = {
  IMAGE: 20 * 1024 * 1024,
  VIDEO: 250 * 1024 * 1024,
  AUDIO: 50 * 1024 * 1024,
  PDF: 40 * 1024 * 1024,
}

export function mediaTypeForFile(file: File | null): AdminMediaType | null {
  if (!file) return null
  if (file.type.startsWith('image/')) return 'IMAGE'
  if (file.type.startsWith('video/')) return 'VIDEO'
  if (file.type.startsWith('audio/')) return 'AUDIO'
  if (file.type === 'application/pdf') return 'PDF'
  return null
}

export function validateAdminMediaFile(file: File, mediaType: AdminMediaType) {
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  const expectedMime = extensionMime[mediaType][extension]
  if (!expectedMime || expectedMime !== file.type)
    return `Chọn tệp ${mediaTypeLabel(mediaType)} đúng định dạng.`
  if (file.size <= 0) return 'Tệp chưa có nội dung. Hãy chọn tệp khác.'
  if (file.size > maxBytes[mediaType])
    return `Tệp ${mediaTypeLabel(mediaType)} vượt quá ${maxBytes[mediaType] / 1024 / 1024} MB.`
  return null
}

export function mediaTypeLabel(mediaType: AdminMediaType) {
  return { IMAGE: 'ảnh', VIDEO: 'video', AUDIO: 'âm thanh', PDF: 'PDF' }[mediaType]
}

export function mediaAccept(mediaType: AdminMediaType) {
  return mediaAcceptForTypes([mediaType])
}

export function mediaAcceptForTypes(mediaTypes: readonly AdminMediaType[]) {
  const extensions = mediaTypes.flatMap((mediaType) =>
    Object.keys(extensionMime[mediaType]).map((extension) => `.${extension}`),
  )
  const mimes = mediaTypes.flatMap((mediaType) => Object.values(extensionMime[mediaType]))
  return [...new Set([...mimes, ...extensions])].join(',')
}

export function uploadFolders(
  capabilities: ApiMediaCapabilities | undefined,
  mediaType: AdminMediaType,
) {
  if (mediaType === 'VIDEO') return []
  return capabilities?.uploadFoldersByMediaType?.[mediaType] ?? []
}

export function folderRoots(folders: readonly string[]) {
  return folders.filter(
    (folder) => !folders.some((other) => other !== folder && folder.startsWith(`${other}/`)),
  )
}

export function preferredUploadFolder(
  capabilities: ApiMediaCapabilities | undefined,
  mediaType: AdminMediaType,
  preferredEnding?: string,
) {
  const roots = folderRoots(uploadFolders(capabilities, mediaType))
  return (
    roots.find((folder) => folder.split('/').at(-1)?.toLowerCase() === preferredEnding) ??
    roots[0] ??
    ''
  )
}

export async function uploadAdminMedia(
  file: File,
  mediaType: AdminMediaType,
  visibility: 'PUBLIC' | 'ENROLLED',
  options: {
    assetFolder?: string
    preferredFolderEnding?: string
    onProgress?: (progress: number) => void
  } = {},
) {
  const fileError = validateAdminMediaFile(file, mediaType)
  if (fileError) throw new Error(fileError)

  options.onProgress?.(0)
  const capabilities = await adminRepository.getMediaCapabilities()
  if (!capabilities.supportedMediaTypes.includes(mediaType))
    throw new Error(`Chưa thể tải ${mediaTypeLabel(mediaType)} lên. Hãy thử lại sau.`)
  const assetFolder =
    options.assetFolder ??
    (capabilities.activeProvider === 'CLOUDINARY'
      ? preferredUploadFolder(capabilities, mediaType, options.preferredFolderEnding)
      : '')
  if (capabilities.activeProvider === 'CLOUDINARY' && !assetFolder)
    throw new Error(`Chưa có nơi lưu ${mediaTypeLabel(mediaType)} được thiết lập.`)

  const controller = new AbortController()
  const intent = await adminRepository.createUploadIntent(
    {
      originalName: file.name,
      mediaType,
      mimeType: file.type,
      fileSize: file.size,
      visibility,
      ...(assetFolder ? { assetFolder } : {}),
    },
    controller.signal,
  )
  try {
    await adminRepository.uploadFile(
      intent,
      file,
      (progress) => options.onProgress?.(progress),
      controller.signal,
    )
    await adminRepository.completeUpload(intent.assetId)
    return intent.assetId
  } catch (error) {
    await adminRepository.deleteMedia(intent.assetId).catch(() => undefined)
    throw error
  }
}
