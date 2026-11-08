# Known limitations

- Excel import is a preview and draft-append foundation. It does not upload workbooks to Cloudinary or persist workbook source files.
- The importer accepts `.xlsx` only, with a 5 MiB limit, and rejects formula cells. It does not import macros, `.xls`, or `.xlsm`.
- Student/admin production E2E and screenshots require approved test credentials. This release does not create enrollments or alter a real learner account.
- Live data verification confirms the exact source question mapping and database readback; it does not replace authenticated UI smoke testing.
