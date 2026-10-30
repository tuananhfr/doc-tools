# Rollback — PI Holding templates (doc-tools, P0)

Nothing in this branch has been merged or deployed, so "rollback" tonight only means: how to
undo this if it were ever merged and enabled.

## If the flag was ever turned on and needs to go back off

This is the only rollback that matters in practice: set `templates.piholding.enabled` back to
`false` via the admin settings page (`/quan-tri`) or `PATCH` the setting directly. Every piece
of UI added in this branch re-checks the flag on every render via `usePihTemplatesEnabled()`
(no caching beyond the existing 30s server-side settings cache, no localStorage, no cookie) —
turning it off makes every sample button/entry point disappear on next load, with no leftover
state anywhere, by construction (see T26 in `tests/results/doc-tools.md`).

## If the code itself needs to be reverted

Every change in this branch is additive:

- Backend: one new setting key, one new self-contained module (`backend/src/templates/`),
  one `app.module.ts` import line, one `next.config.mjs` rewrite line. None of them touch an
  existing table, existing endpoint, or existing module's behavior. Reverting is a clean
  `git revert` of this branch's commits — there is no migration to roll back (`settings`
  table only ever gained one more possible key; nothing was altered or deleted).
- Frontend: a new `frontend/src/features/tools/pih-templates/` folder (delete it), plus small
  additive edits to 8 existing files (`PdfEditorStudio.tsx`, `OcrTool.tsx`,
  `MergePdfPage.tsx`, `SplitPdfPage.tsx`, `ComparePdfPage.tsx`, `ConvertFilePage.tsx`,
  `QrCreatePage.tsx`, `OfficeEditorPage.tsx`) — each edit is a few lines that can be reverted
  independently of the others; none of them changed an existing prop's type or removed
  anything that was there before.
- i18n: new keys only (`pihSample.*` in `pdf.json`/`qr.json`, `office.pihSample.*` in
  `common.json`, all 15 locales) — removing them is safe, nothing else references these keys.

## No data to roll back

No database migration, no schema change, no new table. No binary asset was committed (every
sample is generated client-side on demand). There is nothing stored anywhere that would need
to be purged or restored.
