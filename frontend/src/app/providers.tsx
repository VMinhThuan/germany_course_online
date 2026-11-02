import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { DialogProvider } from '@/shared/ui/dialogs'
import { NotificationProvider } from '@/shared/ui/notifications'
import { AuthSessionProvider } from '@/app/auth/auth-session'
import { isAuthenticatedSessionError } from '@/data/student-demo/errors'
import { publishSessionRevoked } from '@/data/student-demo/session-events'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError(error, query) {
            if (query.queryKey[0] === 'student' && isAuthenticatedSessionError(error)) {
              publishSessionRevoked(error.code === 'SESSION_REVOKED' ? 'revoked' : 'invalid')
            }
          },
        }),
        defaultOptions: {
          queries: {
            retry: 0,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
          mutations: { retry: 0 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <DialogProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </DialogProvider>
      </NotificationProvider>
    </QueryClientProvider>
  )
}
