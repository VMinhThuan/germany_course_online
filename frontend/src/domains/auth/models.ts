/** Anonymous is a frontend identity context; V3 UserRole contains only STUDENT and ADMIN. */
export type AuthPresentationState =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; userId: string }
  | { kind: 'session-revoked'; message: string }
  | { kind: 'error'; status: number; message: string }
