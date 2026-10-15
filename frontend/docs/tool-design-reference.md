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

## PDF tool reference

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
