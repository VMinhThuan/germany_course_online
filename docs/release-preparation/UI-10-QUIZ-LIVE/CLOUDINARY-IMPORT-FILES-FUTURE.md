# Deferred Cloudinary import files

Cloudinary integration for source workbooks is intentionally deferred. The current Quiz seed reads the owner-provided local `.xlsx` files and writes structured Quiz documents through the existing backend service path.

Future `import-files` work should use authenticated raw delivery, backend-signed upload, admin-only access, and source metadata/audit records. It must not expose an answer-key workbook to students or use the folder as a source for student Quiz APIs. This phase adds no Cloudinary environment variables, calls, or adapter changes.
