# Backend Express Serverless Runtime

`backend/src/index.ts` is the Vercel Express entrypoint and default-exports the handler produced by `createVercelHandler`. With valid environment values it creates the shared app through `createVercelApp`. When environment validation fails, it serves liveness from `/health` and returns a redacted 503 for all other routes. It does not import `src/server.ts`, open a listener, start polling, bootstrap an Admin, or create indexes.

The existing shared `createApp` retains `/health`, `/ready`, `/api/v1/**`, `/api/openapi.yaml`, and `/api/docs`, including request IDs, exact-origin CORS, CSRF guards, rate limits and the common error handler. `backend/vercel.json` sets a 60-second function ceiling (the Hobby limit) and includes the OpenAPI document. Memory remains on the Vercel project/runtime default because current Fluid Compute memory is configured in the dashboard, not `vercel.json`.

`/health` is liveness-only. With valid configuration, `/ready` and API requests use the lazy database connection and return a redacted 503 if MongoDB is unavailable. Without valid configuration, `/ready` and API requests return `503 CONFIGURATION_UNAVAILABLE`. Live Vercel status is pending the Git checkpoint and deployment.
