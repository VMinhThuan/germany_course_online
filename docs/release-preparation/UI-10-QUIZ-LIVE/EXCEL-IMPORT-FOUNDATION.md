# Excel import foundation

The browser importer accepts `.xlsx` files up to 5 MiB and selects a visible worksheet containing the required headers `Câu`, `Câu hỏi`, `Đáp án A`, `Đáp án B`, `Đáp án C`, and `Đáp án đúng`. It searches the first 20 rows for the header row and collapses repeated whitespace.

Rows with missing question/option text, invalid answer labels, duplicate prompts, or formula cells are rejected and shown with row/column context. Valid rows map to the admin Quiz draft DTO with one correct option and one point. Formula values are not calculated or executed. `.xls` and `.xlsm` are not accepted; macros and external workbook features are not part of this flow.

Import preview and append are client-side draft actions. There is no direct write from the workbook parser, no automatic replacement, and no Cloudinary dependency. The Admin save action remains the only persistence path.
