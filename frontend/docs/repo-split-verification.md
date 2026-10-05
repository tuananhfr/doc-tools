# Repository split verification — 2026-10-05

## Structure

- G:/workspace/doc- tools/frontend and G:/workspace/doc- tools/backend are independent Git repositories.
- Each repository owns its package.json, lockfile, node_modules, pnpm build-script settings, .gitignore, editor settings, README and CLAUDE.md.
- The parent directory contains only frontend, backend and a directory README. Its package.json, lockfile, workspace configuration and node_modules were removed after both apps built and tested successfully.
- Every direct dependency resolves inside its own repository: 31 frontend dependencies and 11 backend dependencies. Each lockfile has only its own root importer. Neither pnpm settings file declares other packages. Dependency specifications and application scripts were preserved.
- Frontend and backend communicate over HTTP using BACKEND_URL. Source files, dependencies and Git history are separate. No commit or push was made.
- Upstream reference docs, the 450-file SHA-256 manifest and local QA artifacts now belong to the frontend repository. The backend owns its public API documentation.

## Verification

| Check | Result |
| --- | --- |
| Source preservation | 450/450 feature files match the original SHA-256 manifest |
| Frontend logic | 79 files, 1,216 tests passed with standalone dependencies |
| Frontend production | Build passed both before and after deleting the parent workspace/dependencies |
| Backend | Build and real-MySQL API tests passed before and after deleting the parent workspace/dependencies |
| TypeScript | Both repositories passed |
| Encoding | 728 text files checked, valid UTF-8 and no BOM |
| Responsive hub | All 30 screenshot pairs byte-identical to ERPCons across 1440/1280/1024/768/390 widths and light/dark/field themes |
| Tool routes | All 35 routes passed; search, catalog expansion, legacy URL, invalid slug, screen identity and leave guard passed |
| New tool parity | 4 screenshot pairs for barcode/manual house orientation matched at desktop/mobile; PNG/SVG/PDF downloads worked |
| Offline | Reload without network and PDF merge export worked; output had 17 pages |
| Integration | Frontend HTML, proxied stats API and direct backend stats API returned HTTP 200 |
| ERPCons source | Git status remained clean |

Visual verification status: verified for the exercised public Free states. Delivery status: verified for the local production build vmdSTfsv3Q1g8TaJxHsuX at http://localhost:3002/doc-tools and NestJS at http://127.0.0.1:3003. Fresh Chrome contexts drove the journeys after the standalone production build. Representative screenshots at all five widths were opened and inspected. Reports are qa-output/parity-report.json and qa-output/extra/report.json, with their screenshot files. The original Vite server was used only for comparison and was stopped afterward.

The first dependency installation used --ignore-workspace, which also skipped project build-script settings and ended with ERR_PNPM_IGNORED_BUILDS. Installing again from each repository with its own settings succeeded. No source behavior was changed to address that installation issue.

This structural change did not repeat the full golden processing matrix, network privacy sweep or physical camera/compass tests. Their earlier copy verification scope and limitations remain documented in verification.md. The targeted export/offline checks above cover asset resolution after moving dependencies.
