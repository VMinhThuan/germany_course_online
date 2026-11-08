# Database target verification

Approved target: database `paniverse_lms`, MongoDB cluster host `cluster0.arsopo1.mongodb.net`.

The backend production project and its Mongo environment-variable names were inspected without publishing variable values. DBX read access to the approved cluster confirmed the existing published course `NIVEAU_A1_1` / `Niveau A1.1`, including the target `Lektion 1` section. The guarded CLI then connected directly to this host and database, confirmed replica-set transaction support, and verified the authenticated user's collection write privileges before planning any writes.

Dry-run result: the target practice lesson did not exist; neither quiz title existed in the course; both workbooks contained exactly 20 valid questions; no quiz attempts would be changed; no conflicts were found. Dry-run performed no writes.

Live apply and a separate readback verify completed on 2026-11-09. They confirmed the optional lesson and both published quizzes, exact workbook question/answer mapping, 40 total questions, 20 points per quiz, and zero attempts. IDs and the complete readback are in `QUIZ-SEED-AND-VERIFY.md`.

The seed used the URI supplied for this task and checked the connected host/database, transaction support, and write privileges. Vercel environment-variable values are encrypted in the connected account, so this records the exact seed target and does not independently attest which database the deployed backend runtime uses.

Credentials are intentionally omitted from this document and all repository files.
