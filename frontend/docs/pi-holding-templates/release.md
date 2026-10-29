# Release notes — PI Holding templates (doc-tools, P0)

**Status: NOT released. This file documents what a release would involve; no REVIEW or
RELEASE phase was executed tonight, per the task's hard stop after TEST.**

## What this branch contains

Branch: `feature/pi-holding-templates-overnight` (local only — never pushed, never merged to
`main`). Everything is additive and gated by one new, default-OFF setting:
`templates.piholding.enabled` (see `backend/src/settings/settings.definitions.ts`).

10 templates built and wired (flag-gated, anonymous access, `review_status: draft`):

| template_id | Where it shows up |
|---|---|
| `office.pdf.ubot_tech_profile.vi.v1` | `/chinh-sua-pdf` sample list |
| `pdf.merge.brochure_pih.vi.v1` | `/ghep-pdf` picker |
| `pdf.split.brochure_pih.vi.v1` | `/tach-pdf` picker |
| `pdf.compare.lpc_contract_ab.vi.v1` | `/so-sanh-pdf` picker |
| `pdf.convert.lpc_profile.vi.v1` | `/chuyen-doi-file` picker |
| `pdf.ocr.foodtek_receipt.vi.v1` | `/doc-anh` (OCR) picker |
| `qr.create.foodtek_traceability.vi.v1` | `/tao-ma-qr` static tab |
| `office.word.lpc_profile.vi.v1` | `/soan-thao-van-ban` (download-only) |
| `office.sheet.ubot_boq.vi.v1` | `/soan-thao-bang-tinh` (download-only) |

Not built (see `feature_template_matrix.csv` + individual `content/*.md` for reasons):
`office.slide.pih_ecosystem.vi.v1` (PowerPoint, blocked), image before/after, ID photo
(already covered by an existing generic sample), NAS (feature absent).

## Before this can go to REVIEW, a human needs to

1. Read `content/*.md` for all 10 built templates and the 3 N/A ones; confirm the synthetic
   content, brand-name usage (LPC/Ubot/PIH as the group's own names) and "Foodtek" fictional
   company name are acceptable — none of this has had legal/BU/CMO sign-off.
2. Decide whether "download-only" is an acceptable v1 UX for the two Office templates, or
   whether a real WordCraft/GridCraft content-injection path should be requested upstream
   first (see `content/office.word.lpc_profile.vi.v1.md`).
3. Run the live-environment checks listed as gaps in `tests/results/doc-tools.md` (T13 OCR,
   T16 compare-engine, T24 a11y, T29 performance) against a real dev server with the flag
   turned on in a non-production `app_settings` row.
4. Decide whether to pick PowerPoint back up (needs approving a `.pptx` generation dependency
   first — see `content/office.slide.pih_ecosystem.vi.v1.md`).
5. Only then: enable `templates.piholding.enabled` in a staging environment first, never
   directly in production.

## Reviewer: _pending_

## Release decision: _pending_
