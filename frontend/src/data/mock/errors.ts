export interface KnownApiErrorEnvelope {
  success: false
  error: { code: string; message: string; details: null }
}

export type RepositoryError =
  | { kind: 'network'; message: string }
  | { kind: 'api'; status: number; code: string; message: string; envelope: KnownApiErrorEnvelope }

export function mapApiFailure(status: number, envelope: KnownApiErrorEnvelope): RepositoryError {
  return {
    kind: 'api',
    status,
    code: envelope.error.code,
    message: envelope.error.message,
    envelope,
  }
}

export function genericApiMessage(status: number): string {
  return `Yêu cầu chưa hoàn tất (HTTP ${status}). Hãy thử lại sau.`
}
