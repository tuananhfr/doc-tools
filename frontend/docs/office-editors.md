# Office editors

WordCraft, GridCraft and DeckCraft 0.6.1 run as unmodified, self-hosted web builds inside an iframe. Files open and save through the editors' own controls and stay in the browser. The English editor UI is marked Beta and works best on desktop.

## Sources and licenses

| Tool | Source | Pinned version |
| --- | --- | --- |
| Word documents (.docx) | https://github.com/storytold/wordcraft/releases/tag/v0.6.1 | 0.6.1 |
| Spreadsheets (.xlsx) | https://github.com/storytold/gridcraft/releases/tag/v0.6.1 | 0.6.1 |
| Presentations (.pptx) | https://github.com/storytold/deckcraft/releases/tag/v0.6.1 | 0.6.1 |

Each release is licensed under MIT OR Apache-2.0. The builds retain upstream branding and the original LICENSE-MIT and LICENSE-APACHE. The release URL and archive SHA-256 for each engine are pinned in src/features/tools/office/config/office-apps.ts.

scripts/prepare-office.mjs runs during postinstall, predev and prebuild. It checks the archive hash before extraction and verifies every installed asset before reusing a build. Failure stops the command. Build artifacts under public/vendor/office/ are ignored by Git.

To upgrade deliberately, update the version, URL and official release SHA-256 in office-apps.ts, rerun the preparer and repeat all checks below. Do not edit the upstream HTML, JavaScript or WASM.

## Iframe isolation decision

The user approved the same-origin, unsandboxed fallback on 14/10/2026 after testing the opaque-origin sandbox (allow-scripts allow-downloads allow-popups allow-modals, without allow-same-origin).

All three editors started successfully in the sandbox with CORS enabled. However, sandboxed iframe requests bypassed the parent's service worker. WordCraft assets did not enter its runtime cache and reopening it offline failed. The same release in an unsandboxed same-origin iframe was cached and reopened offline successfully.

The iframe therefore has no sandbox. Version and content hashes establish which upstream code is shipped; they do not isolate that code from the site. It can access same-origin localStorage and make same-origin requests with session credentials. HttpOnly cookies cannot be read directly by JavaScript. Changes to editor engines require another deliberate review of this choice.

The iframe still owns its CSS, keyboard shortcuts and WASM lifecycle. Closing it or leaving the tool removes the frame. Since the wrapper cannot know whether the document was saved, it always warns before closing or leaving an open editor.

## Loading and offline

Before the user presses Open editor, the page loads no Office engine assets. The first launch checks index.html, then loads the iframe. The office group in the offline manifest lists vendor files as optional assets, never as precache assets. The existing service worker caches the editor as it is used, and carries its versioned optional assets forward across builds.

JavaScript and WASM use long-lived versioned caching; index.html uses no-cache. Next serves WASM as application/wasm. Compression must be verified with next start and with the production Apache proxy; a Content-Encoding header must never be added without actually compressing the body.

## Workspace modes

Opening an editor expands its workspace to the browser viewport and hides the site header/footer behind it. A compact toolbar offers Minimize, Fullscreen and Close. Minimize returns to the tool page; Expand restores the workspace. Both changes keep the same iframe and its unsaved document.

Fullscreen is requested only from its own button. The root document enters fullscreen so existing Bootstrap dialog portals remain visible. The hook listens for fullscreenchange to synchronize the controls when fullscreen exits externally. Minimize, confirmed Close and leaving the tool exit fullscreen and restore the background navigation. If the browser rejects fullscreen or does not support it, the editor stays expanded and shows a localized message.

The local preview runs on port 3002. The browser API transitions and dialogs are verified, but hiding native browser chrome and physical Escape remain unverified: automated visible Chrome reports document fullscreen while its OS window stays normal, also reproduced on a blank diagnostic page.

## Limits and release checks

- No file handoff, localization or React replacement of the editor UI in this step.
- Complex Office files may render or round-trip imperfectly in the upstream alpha.
- WebGPU or WebGL2 is required.
- Automated insertion of Vietnamese text does not prove Telex/VNI IME support. Manual verification remains a release gate.
- Accessibility checks cover the wrapper's headings, messages and controls. The original upstream canvas is an explicit exception; thresholds in the existing checker remain unchanged.
- Verify all three routes with unit tests, TypeScript, build, network inspection, actual sample-file round trips, offline relaunch and responsive screenshots (360/390/430/desktop).
- support-faq.ts, legal.ts and the data-processing page were reviewed: the wrapper adds no file upload or new server data flow. The data-processing table derives these browser tools from the catalog automatically.

Production deployment, Apache verification and real Telex/VNI testing are separate from local automated checks.

## Local verification (14/10/2026)

Current-render status: partial. The wrapper is verified; upstream font and mobile limitations remain. No production deployment was performed.

- 2,475 frontend unit tests pass; TypeScript and the production build pass.
- All three sample Office formats open, accept edits, export back to their Office format and reopen in the original editor. Exported XML retains the inserted Vietnamese code points; the XLSX fixture retains its numeric value and formula.
- The headless round-trip harness exercises upstream download fallback by disabling showSaveFilePicker in its isolated test context. Native OS save picker behavior is not verified.
- DeckCraft needs browser key events for its custom canvas; DOM insertText does not exercise that input path. This is not an IME/Telex/VNI simulation.
- All three editors reopen offline with the real service worker. Thirty Office vendor assets are optional and zero are precached.
- check-network.mjs runs all three Office cases and reports 3/3 clean: no external-origin traffic and no fixture names/content in request URLs or bodies; visit requests contain only the tool slug.
- check-a11y.mjs reports P0=0, P1=0, errors=0 for the three waiting pages at 360/390/430 in light/dark/field, with both normal and large text. The existing image-tool result check also runs unchanged.
- Responsive screenshots cover waiting/open states at 360/390/430/1440. The expanded workspace also passed 24 combinations of these widths, three editors, and normal/large text. Minimize/Expand preserve the iframe; native fullscreen API entry/exit, visible close dialogs and rejection fallback were exercised. Close confirmation, missing graphics support, a 503 followed by retry, and stay/leave navigation were exercised.
- next start serves all three WASM files with application/wasm and actual gzip encoding (about 14.86/6.95/8.97 MB transferred). Apache production headers/compression remain unverified.

### Known upstream findings

GridCraft and DeckCraft 0.6.1 display missing glyphs for some Vietnamese characters on canvas. The same characters are preserved correctly in the exported files; this is a rendering/font limitation, not UTF-8 data loss. Evidence: ../qa-output/office-editors/xlsx-roundtrip-1440.png and ../qa-output/office-editors/pptx-roundtrip-1440.png. Fixing the engine or changing its pinned release is outside this step.

On phone viewports, the upstream desktop ribbon/start screen can clip or overlap internally. The wrapper remains within the viewport and its close button remains reachable. The page therefore states that the editor works best on desktop. Evidence: ../qa-output/office-editors/xlsx-open-360.png and ../qa-output/office-editors/docx-open-390.png.

Real Telex/VNI input and complex-file fidelity remain manual release checks. Do not treat the automated Unicode round trip as their approval.

Run the harnesses from frontend (set BASE to the preview server and QA_OUT to an ignored output directory):

    node scripts/doc-tools/make-office-fixtures.mjs
    node scripts/doc-tools/check-office-editors.mjs
    ONLY=soan-van-ban,bang-tinh,trinh-chieu node scripts/doc-tools/check-network.mjs
    SITE=http://localhost:3002 PAGES=/soan-van-ban,/bang-tinh,/trinh-chieu node scripts/doc-tools/check-a11y.mjs

Office results and screenshots are under qa-output/office-editors/; expanded workspace evidence is under qa-output/office-fullscreen/; the final a11y reports are under qa-output/office-a11y-final-normal/ and qa-output/office-a11y-final-large/. These artifacts are ignored by Git.

### Saving in the original editors

WordCraft and GridCraft: open with Ctrl+O and save with Ctrl+S (browser save picker, or download fallback). GridCraft also exposes File > Save As > Download (.xlsx).

DeckCraft: Ctrl+S saves its native .deckcraft format. For PowerPoint, open the command palette with Ctrl+Shift+P, search app.exportDialog, select PowerPoint Presentation (.pptx), then Export. The UI command and the engine export command share the same label; the exact search selects the UI dialog.
