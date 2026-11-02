export type SessionEndReason = 'revoked' | 'invalid'
type SessionRevokedListener = (reason: SessionEndReason) => void

const listeners = new Set<SessionRevokedListener>()

export function subscribeSessionRevoked(listener: SessionRevokedListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publishSessionRevoked(reason: SessionEndReason = 'revoked') {
  for (const listener of listeners) listener(reason)
}
