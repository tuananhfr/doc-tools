# Verification — 2026-10-05

## Environment

- Frontend: production Next.js, http://localhost:3002/doc-tools.
- Backend: NestJS/Fastify, http://127.0.0.1:3003; dedicated MySQL database doc_tools.
- Browser: installed Chrome 154.0.8037.93, headless Playwright.
- Upstream: G:/workspace/erpcons_frontend, temporary Vite server on port 3000 for comparison.

## Results

| Check | Result |
| --- | --- |
| Feature source integrity | All 450 feature files match the upstream SHA-256 manifest byte for byte |
| Text encoding | 719 text files checked, valid UTF-8, no BOM |
| Frontend logic | 79 test files, 1,216 tests passed |
| Backend API | Passed with real MySQL: body/slug validation, flat envelopes, 16 concurrent increments, rolling 120/hour/IP limit and expiration; client IP through loopback proxy |
| Production builds | Next.js and NestJS passed; 35 tool routes generated |
| TypeScript | Frontend and backend passed |
| Responsive hub parity | 30 of 30 screenshot pairs byte-identical: top/bottom at 1440, 1280, 1024, 768, 390 pixels; light/dark/field |
| Routes and navigation | 35 headings correct; all-tools count, accentless search, legacy URL, unknown slug, editor screen identity and leave guard passed; no browser errors |
| Golden outputs | 35 of 35 processing cases match the upstream baseline; no mismatches or fixture changes |
| Public network privacy | All 33 script-supported tool flows ran; no flagged requests, file names or input content leaked; writes only to visit counter |
| Password-protected PDF | Wrong password, open password, owner restrictions, owner unlock and form-preserving export passed; qpdf WASM loaded |
| Real PDF text editing | PDFium edit, undo/redo, rotated/cropped pages, true text removal, wrapping and searchable PDF export passed; no browser errors |
| New tools | Barcode and manual house orientation: 4 screenshot pairs byte-identical at 1440/390; PNG/SVG/PDF downloads passed |
| Offline | Service worker controls the production page; offline reload and merge export produced a 17-page PDF |
| Lazy assets | Font embedding, Word export and Vietnamese OCR worked under service worker; no HTTP failures |

Reports and screenshots are under qa-output (gitignored). The golden report uses the upstream script's default temporary output directory. Browser tests that require the ERPCons app branch or a logged-in account were not run because this copy is the public Free branch. Physical camera and compass sensors have not been tested on a real phone. The OCR engine logs two non-fatal parameter warnings (language_model_ngram_on and classify_misfit_junk_penalty); recognition still succeeded with 98 words on the sample page.

## Migration adapters

The feature files remain unchanged. Next.js composition, asset URL handling, hydration of local recent-tool preferences and legacy redirects live outside the copied features. The public counter API runs in the new NestJS backend and uses its own MySQL database. Login/Pro links retain the original presentation and point to ERPCons.

An initial hydration failure in the recent-tools section was fixed in the runtime adapter and the full route/screenshot check then passed. The backend JSON compatibility test initially exposed the default Nest/Fastify parser; a dedicated parser now preserves the upstream body behavior and the test passes.

## Independent repositories

The frontend and backend were split into independent Git repositories after the initial copy. See [repo-split-verification.md](repo-split-verification.md) for the current structure and checks. QA artifacts are now under the frontend repository's qa-output directory.
