# Backend Express Serverless Runtime

`backend/src/index.ts` directly imports Express and mounts the handler produced by `createVercelHandler` on an Express app so Vercel's framework detector recognizes the entrypoint. `src/runtime/vercel-app.ts` shares the business app from `src/application.ts`. `src/persistent-server.ts` remains the VPS entrypoint. The Vercel path does not open a listener, start polling, bootstrap an Admin, or create indexes.

The existing shared `createApp` retains `/health`, `/ready`, `/api/v1/**`, `/api/openapi.yaml`, and `/api/docs`, including request IDs, exact-origin CORS, CSRF guards, rate limits and the common error handler. `backend/vercel.json` sets a 60-second function ceiling (the Hobby limit) and includes the OpenAPI document. Memory remains on the Vercel project/runtime default because current Fluid Compute memory is configured in the dashboard, not `vercel.json`.

`/health` is liveness-only. The Production deployment for source SHA `3063a1ee889fb97bf10449925c9faeb1f3685a7e` is `READY` as deployment `dpl_AdRW7A4okNbVxBggNgZSxyzPV1j3`; a read-only GET to `/health` returned 200. The backend Vercel environment inventory is empty. Consequently `/ready`, `/api/openapi.yaml`, and `/api/v1/courses` returned redacted `503 CONFIGURATION_UNAVAILABLE`; no database connection or application data was accessed.
