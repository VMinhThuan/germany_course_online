# Vercel Environment Matrix

| Variable | Frontend | Backend | Scope/status |
|---|---:|---:|---|
| `VITE_API_BASE_URL` | Yes | No | Public build-time value; intended `/api/v1` after same-origin proxy is configured. Not yet set in Vercel. |
| `NODE_ENV` | No | Yes | `production` for Preview and Production server runtime semantics. |
| `MONGODB_URI` / `MONGODB_DB_NAME` | No | Yes | Required private runtime values for a dedicated approved target; not configured. |
| `JWT_ACCESS_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | No | Yes | Required backend settings; secret unique to environment. Not configured. |
| `APP_ORIGINS`, cookie settings | No | Yes | Exact approved frontend origins; not configured. |
| `CRON_SECRET` | No | Yes | Private, at least 32 characters; add only when a schedule is enabled. Not configured. |
| SMTP settings / reset URL | No | Yes | Optional complete tuple; no provider or test mailbox configured. |
| MEDIA_S3_* | No | Yes | Optional complete private storage tuple; not configured. |

Do not put backend secrets in the repo, GitHub Actions, Vite variables, or chat. The example files contain placeholders only and are not deployable settings.
