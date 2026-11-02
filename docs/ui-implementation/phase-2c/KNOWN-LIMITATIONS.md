# Phase 2C — Known limitations

- Learning data and quiz results are local demo state in browser `sessionStorage`; they are not durable server records.
- The included course and two-question quiz are illustrative A1.1 mock content, not an approved full curriculum.
- Video/audio providers and licensed media URLs were not supplied. The UI explains their unavailable state instead of fabricating playback.
- The worksheet PDF is a demo asset. Real uploaded assets, signed URLs, antivirus/scanning status and private media delivery need backend contracts.
- Frontend route guards and capabilities help demonstrate state only; production authorization must be enforced by API and media services.
- One `sessionStorage` state version is implemented. Cross-device synchronization, concurrency and migration of production state are out of scope.
