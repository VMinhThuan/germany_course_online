# Query Cache and Error Handling

## Query policy

`frontend/src/app/providers.tsx` configures TanStack Query with bounded retry (0 for queries/mutations), a 30-second default stale time and no focus refetch. Feature hooks use domain-scoped keys (`auth`, `student`, `learning`, `quiz`, `orders`, `admin`). Mutations invalidate the smallest affected resource families, then refetch server-calculated state.

## Session transitions

`AuthSessionProvider` clears account-scoped queries when identity/role changes. Logout and `SESSION_REVOKED` clear access token and authenticated cache. Protected requests stop and route guards redirect to login; old Student data is not retained for a newly authenticated identity.

## HTTP error model

`frontend/src/lib/api/client.ts` centralizes base URL, response envelope validation, `ApiError` parsing (HTTP status, error code/details and request ID), timeout and caller abort. Authenticated 401s coordinate one refresh operation and retry once. Network, timeout, aborted, malformed-envelope, validation, authorization and provider-unavailable conditions remain distinguishable.

Pages show skeleton/loading, retryable error, empty states and mutation status feedback. There is no silent mock fallback. Media `503` is a specific state rather than a generic playable fallback. Mutations with irreversible/access effects require explicit user action and, where relevant, confirmation/reason.
