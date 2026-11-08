# Rollback plan

1. Roll back the frontend/backend deployment to the last known good Vercel production deployment if application behavior regresses.
2. Keep the seeded Mongo records and historical attempts intact during a code rollback; the prior code does not require deleting source course data.
3. If the new lesson must be removed from student navigation, use the existing Admin workflow to hide the two quiz Exercises and then hide the dedicated practice Lesson. Do not delete attempts, progress, enrollment, course, or quiz snapshots.
4. If a content correction is needed, use the Quiz Editor. The seed script intentionally refuses to overwrite a same-title Quiz whose content differs from its workbook source.
5. Re-run the seed `verify` mode after remediation and retain the output with secrets excluded.
