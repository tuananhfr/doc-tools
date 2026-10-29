# Overnight log — PI Holding branded templates (doc-tools, P0)

Branch: `feature/pi-holding-templates-overnight`, off `main` at `b75cbdb6` (2026-10-28).
Never pushed, never merged, main untouched. All work is local commits on this branch.

Spec: `D:\Sites\PI Holding — Branded Functional Templates\PIH_Branded_Functional_Templates_V3_Implementation.docx`.
Scope: P0 = `doc-tools` only. Stop hard after TEST (no REVIEW/RELEASE). Flag stays OFF.
100% synthetic/demo data only.

A mid-run harness restart interrupted this pass once, right after the first commit of the
frontend API client file; work resumed from `git status`/`git log` with nothing lost except
one not-yet-written hook file, which was rewritten identically. Noted here in case the commit
history looks slightly choppy around that point.

## DISCOVER (read-only) — summary, full detail in `frontend/docs/pi-holding-templates/inventory.csv`

This repo is considerably larger/more mature than the task brief assumed (it mentions
"office/pdf/image/qr/documents... OCR, format-convert, document-compare, and NAS/storage
integration were NOT confirmed present"). All of OCR, format-convert and document-compare
turned out to be real, substantial, pre-existing features. NAS does not exist. Key findings:

- **Admin settings is exactly the flag mechanism to reuse.** `backend/src/settings/` is a
  tiny, file-defined (`settings.definitions.ts`), `@Global`, 30s-cached key/value store over
  one MySQL table — no migrations, `CREATE TABLE IF NOT EXISTS` only. There is an existing,
  exact precedent for exposing one such boolean to anonymous end-user UI:
  `read.linkEnabled` → `GET /read/config` → `useReadLinkEnabled()` hook, fail-closed on any
  network error. Copied this pattern verbatim for `templates.piholding.enabled`.
- **No generic cross-tool "template picker" exists for branded sample *content*.**
  `hub/components/TemplatePicker.tsx` exists and is used by the CV/Form-templates feature, but
  it picks a blank *structural layout* (which fields exist), not pre-filled sample content —
  a different concept from what this spec wants. Did not reuse/extend it; built a much
  smaller, purpose-specific adapter instead (see INTEGRATE).
- **`pdf/services/editor-samples.ts` (`createEditorSample`) is the real, directly-applicable
  precedent**: it already generates synthetic "invoice/contract/notes" PDFs client-side with
  pdf-lib for the PDF editor's existing sample picker. Every new PDF/OCR/QR template in this
  pass follows that exact shape (pure generator function → `onFiles`/`pickerExtra`), not a
  new mechanism.
- **Office (Word/Excel/PowerPoint) editors are vendored, iframe-isolated WASM apps**
  (WordCraft/GridCraft/DeckCraft) loaded from a static `index.html` with **no observed
  postMessage or query-param channel** to pre-load a document — and the vendor bundles
  themselves are not even present in this checkout (fetched from GitHub releases per
  `office-apps.ts`), so their internals can't be inspected further either. This is a genuine,
  verified UNKNOWN/ABSENT, not a guess, and per the task's own rule it blocks any "auto-open a
  sample inside the editor" approach for all three.
- **`docx` (9.8.1) and `exceljs` (4.4.0) are already repo dependencies**, used elsewhere
  (CV export, OCR export, QR batch). **No `.pptx` generator exists anywhere** (no
  `pptxgenjs`). This is why Word/Excel got a (weaker) download-only integration and
  PowerPoint got none at all.
- **`features/cloud` ("Saved") is NOT a NAS** — it's Pro-tier, per-account, paid cloud
  storage with a real MySQL table and quotas. Correctly out of scope; not touched.
- **Test constraints**: frontend unit tests are vitest, `node` environment, **no DOM** —
  `.test.tsx` files are silently skipped, and anything touching `document`/canvas/React
  hooks/components cannot be unit tested here. Backend tests need a **real MySQL instance**
  and were not run (no MySQL was started tonight, per the hard gate against touching any
  live/shared DB). E2E/a11y/performance all need a running dev server + Chrome/Playwright,
  also not started tonight.

## MAP — full detail in `frontend/docs/pi-holding-templates/feature_template_matrix.csv`

Of the spec's 12 template types: **6 fully built and wired** (PDF edit, PDF merge, PDF split,
PDF compare, Convert, OCR), **1 wired as content prefill only** (QR), **2 built as
download-only** (Word, Excel — real integration blocked by the iframe/engine constraint
above), **1 blocked entirely** (PowerPoint — same engine constraint *plus* no pptx
generator in the repo, and hand-rolling raw OOXML overnight with no way to validate it opens
was judged too risky), and **2 marked N/A because the generic feature already has an
equivalent "try a sample" affordance** (Image before/after via `RemoveBackgroundPage`, ID
photo via `IdPhotoPage` — both already call `sample()`/`trySample()` against a shared
placeholder image), and **1 marked N/A because the feature is absent** (NAS).

## AUTHOR — `frontend/docs/pi-holding-templates/content/*.md` (13 files)

One file per template_id (10 built + PowerPoint + the 2 "already covered" + NAS), each with
goal, source/rights (`synthetic` throughout — no "pending" rights anywhere, per the hard
decision), sample_data flag + how it's labeled inline, input/expected, 3-6 steps, `cta: null`
everywhere (zero CTAs added this pass — kept it as low-friction as possible), and an explicit
"Review: pending" line. "Foodtek" is used as one recurring **fictional** company name across
the OCR and QR samples for narrative consistency — it is not a real PI Holding customer or
product and is called out as such in both content files.

## INTEGRATE — architecture actually shipped

One new feature folder, `frontend/src/features/tools/pih-templates/`:

- `services/templates-config.api.ts` + `hooks/usePihTemplatesEnabled.ts` — the one flag,
  fail-closed, modeled exactly on `read.linkEnabled`.
- `generators/pih-pdf-samples.ts` — 6 pdf-lib-based synthetic PDF generators (tech profile,
  LPC profile, 3 brochure pages, 6-page booklet, contract A/B pair). **Sample text is
  English-only** — a real bug was caught here: pdf-lib's `StandardFonts` (WinAnsi encoding)
  cannot encode several Vietnamese combining diacritics (e.g. "Ẫ"), which is exactly why the
  pre-existing `editor-samples.ts` precedent also uses English-only sample text. Followed
  that precedent instead of adding a new embedded-Unicode-font dependency.
- `generators/pih-ocr-sample.ts` — one canvas-drawn synthetic receipt image (reuses the
  existing `image/services/image-codec.ts` canvas helpers, no new image pipeline).
- `generators/pih-office-samples.ts` — one `docx`-based and one `exceljs`-based generator.
- `generators/pih-qr-sample.ts` — a plain form-patch constant (`text`-kind payload, not
  `url`, specifically so there is never a live address that could error or go stale when
  scanned).
- `components/PihQuickSampleButton.tsx` — self-gating button for the 5 PDF quick tools
  (merge/split/compare/convert/OCR), wired through `QuickToolShell`'s existing `pickerExtra`
  slot, which was declared but **unused by all five pages before tonight** — zero changes to
  `QuickToolShell`, `ToolFlow`, `useQuickSources`, or any task engine.
- `components/PihOfficeSampleDownload.tsx` — the Word/Excel download-only fallback.
- One line each added to `PdfEditorStudio.tsx` (append one more sample kind to the existing
  list), `QrCreatePage.tsx` (one button patching existing form state), and
  `OfficeEditorPage.tsx` (one conditional render in the existing empty state).

Backend: one setting (`templates.piholding.enabled`, boolean, default `false`, no DB table —
reuses `app_settings`), one tiny new module (`backend/src/templates/`, `GET
/api/v1/templates/config`, no guard needed since it's a public read-only boolean, same as
`/read/config`), one `app.module.ts` import, one `next.config.mjs` rewrite line.

i18n: new keys added to `pdf.json`, `qr.json`, `common.json` across **all 15 locales** (vi +
en real text, 13 others copy the en text — this is the repo's own documented, pre-existing
convention for new namespaces, not something invented tonight).

Nothing added touches `wordcraft`/`gridcraft`/`deckcraft`, `pdfium`, `tesseract`, or any other
vendored engine. Every new render path is additive and gated by the one flag, which defaults
to (and, tonight, could only ever resolve to) `false`.

## TEST — full table in `frontend/docs/pi-holding-templates/tests/results/doc-tools.md`

- Wrote and ran 10 new unit tests across 3 files for the generators (PDF page counts, fresh-
  file-per-call semantics, compare-pair bytes differ, docx/xlsx are valid zip containers,
  xlsx formulas are real not baked-in, QR sample round-trips through the real
  `buildPayload`/`createMatrix`). All 10 pass.
- Ran the **entire existing frontend suite** after every change: `npm run lint` (tsc
  --noEmit) clean, `npm test` → **238 test files / 2638 tests, all passing** — the strongest
  regression evidence available without a live browser.
- Ran backend `npm run lint` (tsc --noEmit) clean. Did **not** run backend's real test suite
  (needs a live MySQL instance; not started, per the hard gate).
- Honestly marked NOT RUN (not PASS) where only a live dev server + Playwright could verify:
  OCR accuracy on the generated receipt image, the compare-PDF *engine's* actual diff output
  on the contract pair, mobile/a11y (`check-a11y.mjs`), and performance budget. These need a
  human to run `scripts/doc-tools/check-*.mjs` against a dev server with the flag turned on,
  ideally in staging first.

## Stopped here, as instructed

No REVIEW, no RELEASE. `frontend/docs/pi-holding-templates/release.md` lists exactly what a
human needs to decide/check before either of those phases starts. Nothing was pushed; `main`
was never checked out, reset, or touched.
