# VPS Portability and Dual Runtime

The business API and routes remain in `src/application.ts` and are shared by both adapters.

- Vercel: `src/index.ts` exports the Express app; the function is stateless between invocations and does not start background polling.
- VPS: `npm ci`, `npm run build`, then `npm start` runs `dist/src/persistent-server.js`; it opens the persistent HTTP listener, starts the existing outbox worker, and handles SIGINT/SIGTERM with worker stop and Mongo disconnect.
- Mongo connection pools are not closed after each Vercel request. The VPS closes its connection during graceful shutdown.

No Docker image was added because no VPS distribution/provider or container requirements were selected. The existing Node 22.12+ runbook is the portable deployment contract. Provider-specific process supervision, region, restart policy, TLS and health checks remain operator configuration.
