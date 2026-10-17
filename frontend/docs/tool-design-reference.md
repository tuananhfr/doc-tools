# Approved tool page references

User-approved references, 16 October 2026:

- Image editing: the implemented `/anh-the` page is the baseline. `/cat-chinh-anh` shares its frame.
- Scanning, OCR and format conversion: `Scan.png` supplied by the user.
- Video and audio: `Video - audio.png` supplied by the user.
- PDF tools: `f9bd9554-7711-4bdf-aa20-b90ea38683e0.png` supplied by the user (PDF Editor reference).
- Tool pictogram references: `anh - video.png`, `Bieu mau.png`, `Giai tri.png`, `Tai lieu.png`, `Tinh toan.png` supplied by the user.

Shared structure: breadcrumb and category sidebar; banner with a recognizable icon, short description, trust indicators and illustration; horizontal function navigation below the banner for processing tools; three numbered panels for upload, options and preview/export; quick guide, tips and FAQ on the right; related tools below.

On mobile, stack the panels in task order and allow the function navigation to scroll horizontally. Keep controls readable and touch accessible. Use the site's existing theme variables for light and dark themes.

Adapt controls to each tool's actual capabilities. Do not add inactive cloud, OCR, camera or export actions just because they appear in a reference. Label original previews and generated results distinctly. Keep processing, cancellation, validation, download and batch behavior working.

`ImageStudio` provides the reusable frame and optional function navigation. `/chuyen-doi-anh` applies the processing variant to JPG/PNG/WebP conversion with batch ZIP output.

`/anh-sang-pdf` uses the processing frame with a PDF category sidebar, image ordering and camera upload, compact paper/margin choices, and a live paginated preview using the same sheet layout as PDF export. Keep format and paper tiles concise: icon and name, without descriptive lines underneath.

`/ghep-anh` uses the shared photo frame with upload/reordering, compact 1–3-column layout tiles and spacing presets, and preview/download. Preserve the existing 2–9-photo, 900 px square tile, centered crop, white background and PNG output rules. The basic preview follows the export geometry; the completed download can be previewed directly. Advanced `GraphicWorkspace` layouts remain available with the selected files and their settings retained when switching modes.

## Video, audio and reading implementations

`/cat-video` uses the video/audio reference through `MediaStudio`: one category menu; upload, trim controls and export in three numbered panels; guide/tips/FAQ. The original FFmpeg task, validation, cancellation and MP4 encoding remain in `VideoWorkspace`. Its trim variant adds real source-frame thumbnails, time sliders synchronized with the numeric second fields, and playback of the selected interval. Do not show format/quality switches that the trim engine cannot apply. Edits to the interval clear the previous result. Retain the 100 MB/ten-minute/4K input limits and the MP4 H.264/AAC output with a maximum 1080 px long edge.

`/doc-to-van-ban` uses the same frame adapted to text input, voice/settings and a reading/player panel. Preserve lazy file/OCR loading, per-input state, long-text parts, reading highlights, font size, rate, remembered position and device/Piper playback controls. WAV export remains specific to the Vietnamese Piper voice. Device voices can use online services, and Link remains subject to its runtime server flag; avoid claiming that every reading mode is local. Phones stack the panels and keep the category menu as the only tool navigation.

## Compression, background removal and quick design

`/nen-anh` uses three panels: validated batch input, compression level/maximum edge, and original/result preview plus download. Keep the existing compression engine: preserve each format where supported, keep originals whenever re-encoding is not smaller, and package batches as ZIP. The displayed result notes explain actual savings and resized images. Changing inputs or settings clears the previous result.

`/xoa-phong` follows the approved photo layout: upload/sample image, background and brush controls, original/result tabs and a persistent canvas for painting. Preserve subject segmentation, transparent/white/blue backgrounds, keep/erase strokes, undo, cancellation/retry, PNG export and handoff to ID photos. Checkerboard is only a preview background. Do not remount the canvas when changing preview tabs or use color replacement that removes white clothing.

`/thiet-ke-nhanh` uses the same image frame with a two-column design form and a wider template/preview area. Reuse `GraphicWorkspace` without changing its renderer, templates, dimensions, brand presets, pagination or PNG/JPG/PDF/ZIP outputs. On phones show the input followed by the preview rather than hiding either behind a second tab strip. Image tools use one category menu and no repeated function links below the banner.

## Additional image utilities

`/xoa-metadata-anh`, `/anh-sang-van-ban`, `/do-kich-thuoc-anh`, `/anh-hang-loat`, `/che-dong-dau-anh` and `/mau-sac` share `ExtendedImageStudio`. Keep one compact image-category menu, recognizable tool artwork, a short banner, numbered workspace panels and task-specific guidance. Use existing theme tokens and stack panels on phones.

Adapt the workspace to the task: metadata removal uses upload and original/result comparison with repeat download; batch processing and image OCR use upload, options and a sharp source preview; measurement and redaction give the interactive canvas more width beside its controls; color selection uses editable codes beside a swatch and contrast results. Source previews use the original image rather than enlarging file-list thumbnails.

`StudioFlow` is an optional presentation of `ToolFlow`, retaining the existing validation, tasks, cancellation and result/download screens. Keep batch resize/format/renaming and ZIP output; measurement reference calibration, distance/area/count and undo; redaction/text watermark rendering and unsaved-edit guards. OCR retains its output/profile/advanced settings and quality checks. Its review stage must stay interactive while the task waits for explicit confirmation, outside the disabled processing controls. Generic `/ocr-van-ban` uses the Scanner/OCR frame described below. Color conversion, contrast calculation, copy and supported browser eyedropper behavior remain unchanged.

## PDF tool reference

`/ghep-pdf`, `/tach-pdf` and `/nen-pdf` use `PdfQuickStudio` with one category menu and three numbered panels. `QuickToolShell` opts into `StudioFlow` while retaining file intake, unlock prompts, ordering, validation, cancellation, tasks and result/download actions. `PdfSourcePreview` renders the source PDF with document selection, page navigation and zoom; label it as the source, not a merged or converted result. Release rendered-image URLs when changing pages or leaving the viewer. Keep the file list readable in narrow columns, with full names and a separate row of ordering/removal actions.

Choose a template by workflow, not just input extension. Format conversion such as `/pdf-sang-word` follows `Scan.png` (Scanner/OCR/conversion), not the PDF Editor reference. It uses `FileConversionStudio`: upload on the left, compact colored format tiles and supported OCR/DPI controls in the center, and original/result tabs with download on the right. Keep the form visible after conversion. Word/Excel/JPG/PNG tiles have only an icon and short name, with no descriptive lines underneath. `StudioFlow` has an opt-in inline result for this presentation; other tools retain their result screens. Invalidate the old result when inputs or options change. Preview text extracted from the actual generated DOCX as an excerpt, without claiming Word layout fidelity; display generated single-image results directly. Keep one category menu rather than repeating tool links horizontally. Do not copy unsupported language/quality switches, PDF/TXT outputs, camera or cloud inputs from the mockup.

Preserve whole-file merge order, split ranges/every-N-pages and ZIP results, JPEG-focused PDF compression with actual savings, and Word/Excel/page-image conversion with OCR/DPI options. Do not promise unchanged Word layout or PDF size reduction for every input.

`/ocr-van-ban`, `/anh-sang-van-ban` and `/pdf-sang-anh` also use `FileConversionStudio` following `Scan.png`. OCR keeps all six real outputs as compact tiles, profile/table validation, advanced/corner/quality settings, explicit review and cancellation. Mixed PDF/image source previews use original image bytes and rendered PDF pages. The review remains a full-width interactive stage outside the disabled option fields while processing waits for confirmation. Image-only OCR accepts images and defaults to TXT; it now follows the same Scanner/OCR layout with source/result tabs and inline downloads. PDF-to-image supports JPG/PNG, 96/150/300 DPI, whole-document/batch export and actual single-image preview or ZIP results. These pages keep input/options visible with inline result/download and clear the previous result after input or option changes.

`/sap-xep-pdf` uses a wide page grid beside summary/export controls, preserving accessible move/rotate/remove/reset actions and the unsaved-edit guard. `/danh-so-trang` and `/dong-dau-pdf` use upload, options and a live `DecorationStage` preview with the same layout calculations as export. Label this tab as a live preview, not the unmodified source; the other tab contains the generated PDF result. Keep page scope validation, numbering templates/start/font/position and text/image stamp settings. Changes invalidate the previous result. `/mat-khau-pdf` uses input, passwords/permissions and result panels; preserve AES encryption/decryption and password/owner validation. It downloads on success and offers repeat download; changing the file, mode or settings clears the result. Do not fake a preview of an encrypted document or add an unsupported cancellation control. In narrow file lists, keep order indicators, thumbnails and names in explicit grid columns so the original mobile order-hiding rule cannot overlap text and thumbnails.

`/ghi-am` and `/kinh-lup` use `AccessibilityStudio`: one menu, task-specific guidance and two working panels. Dictation has a large microphone action and editable text beside it. Preserve interim/final recognition handling, restart after benign recognition endings, stop, permission errors, copy and TXT download. State that this is speech-to-text rather than audio-file recording, and retain browser-service privacy information. Magnifier gives the camera view more width beside zoom, freeze/resume, contrast, switch and stop controls. Retain 1–6× digital zoom and release tracks on switch, stop, unmount or a late permission grant after cancellation. Keep the video element mounted while opening the camera. Device-dependent recognition and camera quality require real-device checks in addition to simulated browser verification.

Use the supplied PDF Editor mockup as the visual standard when updating PDF tools. This records design guidance; it does not imply that every illustrated capability already exists or that all PDF pages have been updated.

- Shell: shared header, breadcrumb and back action; compact tool-category sidebar on the left; working area in the center; quick guide, tips and FAQ on the right. Soft blue background, white cards, thin blue borders and rounded corners.
- Banner: red PDF document icon, large tool title, short purpose statement, trust indicators and a friendly document illustration. Blue remains the primary action color; green indicates successful or reassuring states.
- Function navigation: a horizontal row below the banner for editing, annotation, forms, signing, splitting/merging, conversion, compression and protection. Display only working destinations or supported modes. Clearly highlight the current function.
- Main workspace: three columns containing four numbered groups. Left: upload/drop area and optional working sample documents. Center: editing tools, then advanced/export options and a prominent export action. Right: a large document preview. Adapt the groups and column widths to the specific PDF task rather than adding irrelevant editing controls to simple tools.
- Editing actions: compact tiles with a distinct icon color and a short label, such as text, image, drawing, highlight, note, insert, delete and rotate. Avoid paragraphs under action tiles. Include only actions supported by the implementation.
- Advanced options: compact labeled controls and clearly labeled switches. Settings such as preserving links, forms or original layout must reflect actual export behavior; do not offer cosmetic switches or unsupported guarantees.
- Preview: a readable paper page on a neutral viewer surface, with page navigation, page count, zoom and fullscreen where available. Keep the preview consistent with the exported document and expose loading/error states.
- Supplementary content: concise numbered guidance, practical tips and collapsible FAQ. Sample documents should be selectable and functional. Cloud-source buttons require working integrations and must not be added solely to match the picture.
- Responsive behavior: retain the same visual language as the approved image and processing pages. On phones, stack upload, tools/options and preview/export in task order; keep function navigation horizontally scrollable and controls touch accessible. Use existing theme tokens for dark mode.
- Preserve the editor's real capabilities, keyboard shortcuts, file validation, cancellation, state/history and export behavior while adapting its presentation. Mockup text (including upload limits and PDF/signature claims) is illustrative, not an instruction to change product limits or functionality.

## PDF reading, redaction, comparison and signing

`/che-thong-tin-pdf` and `/ky-tai-lieu` use `PdfQuickStudio` with a wide interactive page on the left and summary/signature controls plus export on the right. Reuse `RedactStage` and `SignStage` without changing their coordinate systems, navigation, undo/clear actions or unsaved-session guards. Redaction export must continue removing underlying content by rasterizing marked pages; the preview alone does not modify the source. Signing inserts a drawn/uploaded signature image, supports placement and size, and does not claim digital certification. Disable the signature pad during export and wait for a newly rendered signature before enabling export.

`/so-sanh-tai-lieu` has file/order and comparison options above two source viewers, then an inline text report with copy/TXT download. Preserve exactly-two-file validation, old/new ordering, whitespace/case options, text-only comparison and the error for documents without usable text. Changing files or comparison options clears the previous report. Side-by-side source viewers do not imply visual/layout comparison by the engine.

`/xem-pdf` uses `PdfReaderStudio` inside the existing `DocToolsPage` session, with file input/actions beside a wide `DocReader`. Reuse page navigation, zoom/fit-width, Ctrl+F/search/OCR, forms/decoration/export panels, unlock handling and reset confirmation. Show search/export on demand. Reader/editor links retain the same workspace; entering reader mode must not open the editor's previous preview as a modal. Keep an explicit accessible name on the page selector and preserve the selected document data and edits when switching presentations. There is one category menu, with task actions rather than a repeated tool-navigation strip.

## QR & Barcode reference

Use the supplied `qrcode.png` reference for QR tools: green code artwork, a concise hero with trust indicators, one category menu on the left, and quick guide/tips/FAQ on the right. All five QR pages use only this menu for switching tools; do not repeat the same links below the banner. The working area has two columns: input/options and a prominent result/preview. On phones these stack in task order. Reuse the established rounded cards, blue actions, theme tokens and sharp vector icons.

Adapt the content to the task. `/doc-ma-qr` uses image upload/drop/paste or the existing camera scanner on the left; decoded content and the uploaded-image view on the right. Keep safe explicit link opening, copy actions, Wi-Fi fields, barcode checks, session results, duplicate handling and embedded trace reporting. A local sample QR is generated and decoded by the real scanner. Do not add creation settings, cloud imports, permanent history or inactive mockup buttons to the reader. Images are processed locally; supported content tiles are informational.

`/tao-ma-qr`, `/vietqr-chuyen-khoan`, `/tao-ma-vach` and `/quan-ly-ma` share `QrStudio` and its two-column `CodeWorkspace`. Preserve live static QR creation, content types, color/background customization and PNG/SVG/PDF export; VietQR validation and its explicit recipient-check note; barcode type/size controls, checks and CSV/Excel batch export; dynamic-code consent, expiry, receipts, optional device storage and revocation. The creation page keeps its static/dynamic/label modes and their state; label sheets use the same input/preview arrangement. Dynamic mode clearly states its network requirement and switches guidance accordingly. Do not claim local-only processing for server-backed codes, add unimplemented logo/shape controls, or turn barcode and bank input into unsupported lookup integrations. On phones, the same category menu becomes a compact horizontal strip above the banner; stack input before preview. Keep within-tool mode switches such as static/dynamic/labels and single/batch.

## Tool pictograms

Use `ToolArtwork` and its stable ID mapping for tool cards, category listings, tool banners and related tools. Follow the five category references: saturated rounded color tiles with simple white pictograms; recognizable multicolor drawings for playing cards, Tarot, numerology and the lucky wheel. Keep identity consistent across pages. Image editing uses pink/yellow/green/blue/purple as in the references; file types use recognizable document shapes and short format marks; calculators use a calculator, coins or the relevant measuring symbol. Portraits, camera/video, image frames, scissors and the background-removal wand should be distinguishable at small sizes.

Artwork is original SVG and locally served Bootstrap vector symbols. Keep it sharp without blur, avoid reusing a single generic shape for unrelated tools, preserve visible tool names as accessible labels, and retain a fallback icon for future tools. Outline navigation and interface action icons remain compact navigation controls.

## PDF editor implementation

`/chinh-sua-pdf` now uses `PdfEditorStudio`: upload/sample documents and sortable page thumbnails on the left, labeled editing tools plus existing search/forms/decoration/export controls in the middle, and the interactive page viewer on the right. `PagePreviewModal` also supports an embedded view and portals its annotation toolbar into the center column. Its fullscreen mode uses the same editing session. Canvas previews survive moving between embedded and fullscreen hosts.

Use the existing markup, crop, text rewrite, page operations, form and export engines. Keep eight primary annotation tools visible and additional tools/exports expandable. Three local practice PDFs are generated on demand. Image uploads remain supported as additional pages; the reference's image-overlay and cloud actions are not presented as unsupported controls. Separate PDF tools are real links and keep the existing unsaved-session leave guard.

## Text and document tools

`/tao-cv`, `/mau-don`, `/so-thanh-chu`, `/chuyen-font-tieng-viet` and `/dem-ky-tu` share `TextDocumentStudio`: one compact category menu, tool artwork, concise banner, task guidance/tips/FAQ and related tools. Use the Document & Form reference for CV/forms, with a single template strip above input and preview/export columns. Stack those panels in task order on phones and keep the template strip horizontally scrollable. Preview cards may stay sticky on wide screens; keep the paper readable in both themes and preserve the print portal separately from screen styling.

CV keeps its five templates, live preview, experience/education entries, session-only portrait, optional local draft storage and actual PDF/DOCX/print exports. Forms keep all six templates, per-template session drafts, date/amount validation and actual exports. Do not add unsupported template categories, cloud storage or signatures simply to reproduce the reference.

Number-to-words and encoding conversion use input/options beside a live result with copy. Keep integer validation and linh/lẻ, bốn/tư variants; keep all seven encoding/case/diacritic modes and the Unicode guard. Character count uses an editable text area beside five clearly labeled statistics, retaining grapheme-aware character counts, word/line/paragraph rules and clear action. Guidance must reflect the current layout, particularly where the CV template picker lives. These tools have no duplicate tool-navigation strip below the banner.

## Calculators and calendar

`CalculationStudio` applies the Calculator reference to `/tinh-toan-nhanh`, `/chuyen-doi-don-vi`, `/lich-am`, `/so-thanh-chu`, `/vay-tra-gop`, `/so-sanh-gia-theo-don-vi`, `/diem-hoc-tap`, `/chia-tien-nhom`, `/tinh-tien` and `/tinh-ngay`. Keep one compact category menu for all ten tools, task-specific guidance and a live input/result layout. In-tool selectors (area/volume/mass, tax/percentage, date modes) remain distinct from navigation between tools. Stack input before results on phones/tablets; retain theme tokens, accessible controls and readable numbers/units.

Quick calculation uses recognizable shape/material tiles for its existing nine formulas, preserving values per formula, quantities and density presets. Unit conversion keeps source/destination selection, swap, primary conversion and copyable results for all supported units. Number-to-words keeps its approved two-card layout and integer/reading-style validation, with the calculation category menu. Money calculations retain URL-driven groups, per-operation input, expression and formula-version display.

Loan/savings retains both repayment methods, annual-rate input, renewal rules, validation and existing contract notes. Show principal/interest proportions from actual computed totals and put the complete, scrollable repayment table below the input/result cards with its real CSV export. Price comparison shows the two products distinctly and preserves the rule that quantities must already share a common unit. Grade/admission, group settlement and date calculations retain their existing rules and input state when switching modes, including group membership/rename behavior and the explicit exclusion of only weekends from workday counts.

The lunar calendar keeps a wide month view beside selected-day details, followed by lunar-to-solar conversion and anniversaries. Preserve holiday layers, month navigation, leap-month checks, source/version information and cultural context. Core conversion is local; the optional cross-check sends the selected date to the server. Do not claim that this network-backed cross-check works offline or remove it to match a visual reference.

## Explore and entertainment

`EntertainmentStudio` applies the Entertainment reference to `/than-so-hoc`, `/bai-tay`, `/tarot`, `/vong-quay` and `/lich-am`. Use one compact category menu for these five tools, recognizable existing tool artwork, concise guidance/tips/FAQ and related tools. Keep the approved lunar-calendar workspace and its conversion/source controls; only its surrounding category frame changes. The calendar retains its calculator workspace styling through the scoped lunar variant.

Card tools put setup before a large card table. Choose the supported draw size with one row of buttons, without a duplicate select. Tarot keeps its optional reversed cards. When a draw arrives, the table expands to the available width for card art, meanings, conclusion, source information and downloads. Preserve all draw counts, idempotent retry, expiry handling, reveal gating, zoom dialogs and actual PDF/PNG reports. Unrevealed cards must expose no meaning; the overview and export remain gated until all cards are revealed. Keep the card-face flip and reduced-motion behavior.

Numerology separates input/consent from the introductory result card, then expands the completed reading. Preserve the existing date/name/year rules, server consent, normalization, per-metric reduction steps, null-name metrics, separate personal-year interpretation, provenance and reports. Keep the Vietnamese interpretation corpus and its language disclosure unchanged.

The wheel uses an editable options column and a prominent wheel/result column. On narrow screens, order options, wheel, settings and saved lists; keep a single mounted wheel and its existing pointer geometry, random selection, sound, elimination, history and restore behavior. Saved lists remain browser-local and retain load/delete confirmation.

Processing labels must reflect the actual engines: numerology and card drawing need a server connection; revealing received cards is local. The wheel runs locally, and the calendar cross-check remains network-backed. Do not copy the reference image's blanket offline/local claim onto server-backed tools or remove existing consent, source and reference notes to simplify the layout. The maintained entertainment browser harness selects draw-size buttons and waits for the card flip to finish before testing zoom.

## Everyday tools

`DailyStudio` is the current shared category frame for `/lich-am`, `/tien-dien`, `/diem-hoc-tap`, `/chia-tien-nhom`, `/the-ghi-nho` and `/huong-nha-la-ban`. It supersedes the calendar, grade and group pages' surrounding frames described above, while preserving their existing calculator/calendar workspaces. Use one six-item category menu, task-specific guidance and related tools; do not add a second tool-navigation strip.

Electricity/water uses input and live bill-result cards. Preserve editable electricity tiers, household multipliers, tax, water fees, signed-rule status/source checks and optional account save. Never present user-entered rates as verified current tariffs. Flashcards uses question/answer creation beside review, then an explicit remembered/forgotten choice; cards remain browser-local. Capture one timestamp before updating state when adding a card so that it is immediately due even when React defers the state updater.

Orientation preserves its live/manual compass, homeowner/professional modes, age options, image/PDF placement, measurement state, exports and leave guard. Give the compass a wider working column on desktops, stack controls on smaller screens, and retain manual input when sensors are unavailable. Sensor support still requires a compatible device and permissions; do not claim it was verified by a desktop browser test. Calendar conversion, grade/admission calculation and group settlement retain their existing rules and task order.

Card-draw connection failures must identify a temporarily unavailable backend separately from invalid response data and validation errors. Keep the same idempotency key for a retry. Verify the actual frontend proxy and database-backed API when diagnosing draw failures; mocked UI responses alone cannot confirm service availability.

## Public categories and help

`ReferencePage` applies the approved directory/help reference to `/gia-dinh`, `/kham-pha-giai-tri` and `/huong-dan`: compact left navigation, searchable hero, recognizable tool or guide artwork, responsive cards, factual FAQ/support panels and device strip. Category search and subgroup selection keep their URL state. Upcoming tools are opt-in; changing back to available tools resets a subgroup with no available entries. Keep the family-calendar product link separate from the tool catalog. Guide topic links must lead to real content; do not invent video tutorials or unsupported tools from the design image. Entertainment guidance must disclose reference-only content and server-backed card drawing.

Construction has moved to ERPCons. Keep dedicated construction capabilities in `EXTERNAL_CAPABILITY_OWNERS`, outside `TOOL_CATALOG`, public search, navigation, counts, sitemap and coming-soon cards. The former `/xay-dung` entry redirects to `/cong-cu`. Do not remove shared household/image tools such as the compass and image measurement. Keep house-direction guidance under Family, and omit construction estimate guides and obsolete construction search intents.

## Office and video

`OfficeStudio` gives Word, spreadsheet and slide editors one three-item category menu and the Document & Form frame. Load the editor only after the existing open action. Preserve the same mounted iframe when expanding/minimizing, fullscreen behavior, close/leave confirmation and native file exports. The editor remains in English and local; do not add unsupported cloud saving or fake upload controls around it.

Compression, trimming and video-to-GIF use the Video & Audio reference with upload, settings/source preview and output/download columns. `VideoProcessStudio` preserves the shared FFmpeg task engine, progress, cancellation, actual downloads, file limits and licenses. GIF adds a real clip preview and range sliders alongside the existing exact time fields, width and frame-rate controls. Clear stale output when settings change; validate selected ranges against source duration before processing. Preserve the original video and explain when compression does not reduce size.

DeckCraft uses its native format for Ctrl+S. Export PPTX through Ctrl+Shift+P, select the second `Export…` entry (the UI dialog), then `PowerPoint Presentation (.pptx)`. Keep slide guidance explicit so users do not confuse a native save with a PowerPoint export.
