# MongoDB Connection Strategy

Vercel requests use one lazy connection promise per warm Node.js instance. Concurrent cold requests share that promise; rejection clears it so a later request may retry. The selection timeout is bounded to 5 seconds and the Vercel pool to five connections. Connections are retained for warm reuse and never disconnected per request. Existing Mongo transactions remain unchanged and still require a replica set.

VPS startup continues to connect once before listening and uses its existing pool setting. Production does not auto-create indexes; the BE-06A plan/apply workflow remains separate.

No URI, database name, replica set, network allowlist or backup checkpoint was verified for Vercel. Do not reuse a chat-pasted URI. `MONGODB_URI` and `MONGODB_DB_NAME` must be entered only through an owner-approved secret/configuration channel for a confirmed isolated target. Until then `/ready` must remain 503 rather than report a false pass.
