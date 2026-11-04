# Observability and Alerts

**Status: source logging IMPLEMENTED; dashboards/alerts PREPARED_ONLY.** No external monitoring service was selected or configured.

## Existing evidence

- Pino logs service name and request ID correlation. Request completion records method, path, status, and duration without request body, headers, cookies, query values, or user secrets.
- Redaction paths cover common password, token, cookie, authorization, Mongo URI, and SMTP password field names. Error responses are generic; logs use error type rather than stack/message in request failures.
- Admin workflows create audit events for business changes, including order approval/cancellation and media/account actions.
- `/health` and `/ready` expose only coarse status; there is no public detailed diagnostic endpoint or metrics exporter.

## Monitor in staging

- HTTP request/error counts and latency, grouped by route/status without PII.
- Mongo connectivity/readiness, connection pool pressure, transaction errors, and process restarts.
- Email outbox PENDING count, oldest pending age, FAILED count, retry count, and lease reclaim.
- S3 signing, HEAD, upload verification, playback and deletion failures.
- Audit events for payment approval/cancellation and Admin/bootstrap changes.
- Host CPU, memory, disk/log volume, and shutdown/restart duration.

## Proposed starting thresholds (not measured baselines or commitments)

- Alert on readiness unavailable for 1 minute; investigate any repeated process restart (for example, 3 within 10 minutes).
- Alert on 5xx above 2% for 5 minutes or p95 latency above 1 second for 10 minutes after establishing traffic baselines.
- Alert when the oldest pending email exceeds 5 minutes, any job reaches FAILED, or backlog grows continuously for 10 minutes.
- Alert on repeated S3 signing/HEAD failures and any failed backup/restore check.

Owner must approve threshold, retention, redaction review, access roles, alert destinations, on-call ownership, and cost. Do not add a monitoring stack or authenticated diagnostics endpoint without that decision.
