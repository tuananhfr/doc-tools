# Chuyện Nhỏ — Feature Registry + code map (G0)

Bản kiểm kê AS-IS của 24 công cụ, lập ngày 03/10/2026 theo gate **G0** của
"ERPCons Chuyện Nhỏ FINAL v2.0" (§3 Repository Audit, §4 Feature Registry schema).
Lượt này **không sửa code**: mọi ô điền từ code đang có, chỗ chưa xác định được
ghi `UNKNOWN`. Bẫy và lý do thiết kế nằm ở [doc-tools.md](doc-tools.md) — không
lặp lại ở đây.

Đường dẫn trong bảng tính từ `src/features/tools/` trừ khi ghi khác.

## 1. Kết luận nhanh

| Câu hỏi của G0 | Trả lời |
| --- | --- |
| Số công cụ | 33, tất cả **ACTIVE** từ 03/10/2026 (`compare`, `sign` đã làm). `postal-code` đã gỡ 03/10/2026 (không có dataset) |
| 100% công cụ đã map vào code? | Có — 33 công cụ map vào 32 màn (`xem-pdf` và `chinh-sua-pdf` chung màn `editor`); không còn công cụ "Sắp có" |
| `processing_mode` | Cả 21 công cụ là **LOCAL_ONLY**: không byte nào của tệp / nội dung rời trình duyệt — đã soi network, xem mục 7.3 |
| Lệnh gọi máy chủ | Chỉ hai, đều của hub: `POST tools/visits {tool: slug}` khi mở một công cụ, `GET tools/stats` ở trang chọn. Không mang tên tệp, nội dung hay định danh người dùng |
| AI / LLM / token | Không có. OCR là tesseract.js chạy trong tab (xem mục 7, điểm 1) |
| Backend riêng | Chỉ module Drupal `erp_tools` (bộ đếm lượt mở). Không queue, không lưu tệp, không TTL |
| Cờ bật/tắt | MỘT cờ cho cả bộ: `VITE_DOC_TOOLS` (`appConfig.docTools`). Không có cờ từng công cụ; công tắc từng công cụ duy nhất là `status: 'ready' \| 'soon'` viết cứng trong danh mục |
| Analytics | Chỉ bộ đếm lượt mở theo slug. Không có sự kiện started / completed / failed / search_no_result |

## 2. Feature Registry

`tool_id` = trường `id` trong `hub/config/tool-catalog.ts` (chưa từng đổi; spec
yêu cầu bất biến). Mọi công cụ: `processing_mode = LOCAL_ONLY`, `quota = không`,
`flag = VITE_DOC_TOOLS` (chung), `owner = UNKNOWN` (chưa phân công).

### 2.1. Tài liệu

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `scan-to-pdf` | `anh-sang-pdf` | ACTIVE | `images-to-pdf` → `pdf/pages/quick/ImagesToPdfPage` | PDF (`imagesToPdfTask` → `buildPdf`), Camera | JPG, PNG, ảnh chụp → 1 PDF; khổ A4 / A3 / Letter / vừa ảnh, lề 0 / 10 / 20 mm | NONE |
| `merge-pdf` | `ghep-pdf` | ACTIVE | `merge-pdf` → `pdf/pages/quick/MergePdfPage` | PDF (`mergeTask` → `buildPdf`) | ≥ 2 PDF → 1 PDF | NONE |
| `split-pdf` | `tach-pdf` | ACTIVE | `split-pdf` → `pdf/pages/quick/SplitPdfPage` | PDF (`splitTask` → `buildPdf` / `buildSplit`) | 1 PDF → PDF hoặc .zip; theo khoảng trang hoặc mỗi N trang | NONE |
| `compress-pdf` | `nen-pdf` | ACTIVE | `compress-pdf` → `pdf/pages/quick/CompressPdfPage` | PDF (`compressTask` → `buildPdf` / `buildBatch`) | PDF (nhiều) → PDF hoặc .zip; mức vừa / mạnh | NONE |
| `convert-file` | `pdf-sang-word` | ACTIVE | `convert-file` → `pdf/pages/quick/ConvertFilePage` | PDF + Office (`convertTask` → `buildOffice` / `buildImages` / `buildBatch`) | PDF (nhiều) → .docx, .xlsx, JPG, PNG (96 / 150 / 300 DPI) | NONE |
| `view-pdf` | `xem-pdf` | ACTIVE | `editor` → `pdf/pages/DocToolsPage` | Trình chỉnh sửa (toàn bộ engine PDF) | PDF, JPG, PNG → PDF, .zip, ảnh, .docx, .xlsx | NONE |
| `edit-pdf` | `chinh-sua-pdf` | ACTIVE | `editor` → `pdf/pages/DocToolsPage` | như trên — **cùng một màn** | như trên | NONE |
| `ocr` | `ocr-van-ban` | ACTIVE | `ocr` → `pdf/pages/quick/OcrPage` | OCR (`ocrTask` → `recognizePage`) + PDF | PDF, JPG, PNG → PDF tìm được chữ hoặc .txt; chỉ tiếng Việt | NONE (kết quả OCR giữ trong RAM) |
| `char-count` | `dem-ky-tu` | ACTIVE | `char-count` → `utility/pages/CharCountPage` | `utility/utils/text-stats.ts` | chữ gõ vào → ký tự, từ, dòng, đoạn | NONE |
| `compare` | `so-sanh-tai-lieu` | ACTIVE | `compare-pdf` → `pdf/pages/quick/ComparePdfPage` | PDF (`compareTask` → `loadPageText` + `utils/text-diff.ts`) | 2 PDF có lớp chữ → báo cáo .txt các dòng khác nhau; bỏ qua khoảng trắng / hoa thường | NONE |
| `sign` | `ky-tai-lieu` | ACTIVE | `sign-pdf` → `pdf/pages/quick/SignPdfPage` | PDF (`signTask` → `buildPdf`, `ImageStamp.spots`) | 1 PDF + chữ ký vẽ tay hoặc ảnh PNG / JPG → PDF; đặt tự do, nhiều chỗ, nhiều trang. KHÔNG phải chữ ký số | NONE (chữ ký không lưu lại) |

### 2.2. Hình ảnh

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `image-to-text` | `anh-sang-van-ban` | ACTIVE | `image-to-text` → `pdf/pages/quick/ImageToTextPage` | OCR — **cùng `ocrTask`** với `ocr`, cố định đầu ra `text` | JPG, PNG → .txt | NONE |
| `measure-image` | `do-kich-thuoc-anh` | ACTIVE | `measure-image` → `image/pages/MeasureImagePage` | Image (`measureTask` → `measure-render`) | 1 ảnh JPG / PNG / WebP → ảnh có số đo; khoảng cách, diện tích, đếm | NONE |
| `convert-image` | `chuyen-doi-anh` | ACTIVE | `convert-image` → `image/pages/ConvertImagePage` | Image (`convertImagesTask`) | JPG / PNG / WebP (nhiều) → JPG / PNG / WebP, ảnh hoặc .zip; 3 mức chất lượng | NONE |
| `compress-image` | `nen-anh` | ACTIVE | `compress-image` → `image/pages/CompressImagePage` | Image (`compressImagesTask`) | như trên → cùng định dạng, ảnh hoặc .zip; 3 mức nén + cạnh dài tối đa 3840 / 2560 / 1920 / 1280 | NONE |
| `batch-image` | `anh-hang-loat` | ACTIVE | `batch-image` → `image/pages/BatchImagePage` | Image (`batchImagesTask` → `reencode` + `utils/batch.ts`) | ≤ 100 ảnh → ảnh / .zip; đổi cỡ (cạnh dài, rộng, cao, %), đổi định dạng, đổi tên theo mẫu `{name}` `{n}` | NONE |
| `mark-image` | `che-dong-dau-anh` | ACTIVE | `mark-image` → `image/pages/MarkImagePage` | Image (`markTask` → `mark-render`) | 1 ảnh → ảnh cùng định dạng; khung che (khối đen ghi vào điểm ảnh), dấu chữ 9 vị trí hoặc lặp chéo | NONE |
| `id-photo` | `anh-the` | ACTIVE | `id-photo` → `image/pages/IdPhotoPage` | Image + Print (`idPhotoTask` → `photo-sheet`, `photo-layout`) | 1 ảnh → tờ in PDF / tờ JPG 300 DPI / một ảnh thẻ; 5 cỡ ảnh, 4 khổ giấy, số bản, khoảng cách, viền cắt | NONE |
| `crop-image` | `cat-chinh-anh` | ACTIVE | `crop-image` → `image/pages/CropImagePage` | Image (`cropTask` → `crop-render`) | 1 ảnh → ảnh cùng định dạng; 6 tỉ lệ, xoay 90°, sáng / tương phản | NONE |
| `color` | `mau-sac` | ACTIVE | `color` → `utility/pages/ColorPage` | `utility/utils/color.ts` | mã màu / hút màu → HEX, RGB, HSL, tương phản WCAG | NONE |

### 2.3. Tính toán

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `quick-calc` | `tinh-toan-nhanh` | ACTIVE | `quick-calc` → `utility/pages/QuickCalcPage` | `utility/config/calc-formulas.ts` + `utility/utils/calc.ts` | 9 công thức: diện tích (4 hình), thể tích (2), khối lượng (thép cây, thép tấm, thể tích × khối lượng riêng) | NONE |
| `money-calc` | `tinh-tien` | ACTIVE | `money-calc` → `utility/pages/MoneyCalcPage` | `utility/config/money-presets.ts` + `utility/utils/money.ts` | 10 phép có `id` + `version`: phần trăm (3), thuế & chiết khấu (3), lãi gộp (3), chia tiền; thuế suất nhập tay | NONE |
| `date-calc` | `tinh-ngay` | ACTIVE | `date-calc` → `utility/pages/DateCalcPage` | `utility/utils/date-calc.ts` | khoảng cách hai ngày (ngày lịch, ngày làm việc, cuối tuần), cộng / trừ ngày lịch hoặc ngày làm việc; chỉ loại T7 / CN | NONE |
| `unit-convert` | `chuyen-doi-don-vi` | ACTIVE | `unit-convert` → `utility/pages/UnitConvertPage` | `utility/config/units.ts` + `utility/utils/unit-convert.ts` | chiều dài (8 đơn vị), diện tích (7), khối lượng (7) | NONE |

### 2.4. Dữ liệu

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `qr-create` | `tao-ma-qr` | ACTIVE | `qr-create` → `qr/pages/QrCreatePage` | QR (`qr-payload`, `qr-matrix`, `qr-render`) | URL, văn bản, Wi-Fi, số điện thoại, email, danh thiếp vCard 3.0 → PNG (cạnh ≥ 1024) và SVG; 6 màu | NONE |
| `barcode-create` | `tao-ma-vach` | ACTIVE | `barcode-create` → `qr/pages/BarcodeCreatePage` | Mã vạch (`barcode-check`, `barcode-render`, bwip-js) | một mã hoặc CSV / XLSX ≤ 500 dòng; EAN-13/8, ITF-14, Code 128, Code 39 → PNG 300 dpi, SVG, PDF vector; lô → PDF / zip. Không sinh số GS1 | NONE |
| `qr-read` | `doc-ma-qr` | ACTIVE | `qr-read` → `qr/pages/QrReadPage` | QR (`qr-scan`, `useQrScanner`) | ảnh (`image/*`), dán Ctrl+V, camera → nội dung mã; QR + 12 loại mã vạch; kiểm số kiểm tra EAN / UPC / ITF-14 | NONE |
| `random-code` | `tao-ma-ngau-nhien` | ACTIVE | `random-code` → `utility/pages/RandomCodePage` | `utility/utils/random-code.ts` (`crypto.getRandomValues`) | mật khẩu 8–64 ký tự; mã đơn 4–16 ký tự + tiền tố | NONE |

### 2.5. Tiện ích khác

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `quick-note` | `ghi-chu-nhanh` | ACTIVE | `quick-note` → `utility/pages/QuickNotePage` | `utility/services/notes-store.ts` + `utility/utils/notes.ts` | ghi chú + danh sách việc | **LOCAL**: `localStorage` khoá `erpcons.tools.notes`, JSON thường, không gắn tài khoản |

### 2.6. Nhà & đời sống

| tool_id | slug | status | Màn → trang | Engine | Vào → ra | Lưu trữ |
| --- | --- | --- | --- | --- | --- | --- |
| `house-orientation` | `huong-nha-la-ban` | ACTIVE | `house-orientation` → `orientation/pages/HouseOrientationPage` | `orientation/utils/*` (hướng, la bàn, Bát trạch, mặt trời) + `services/orientation-export.ts` (pdf-lib nạp động) | ảnh / 1 trang PDF / không ảnh → ảnh (giữ EXIF) hoặc PDF (trang gốc vector) + JSON số đo | NONE |

Nhóm Kỹ thuật: đã khai trong `ToolCategory`, chưa có công cụ.

## 3. Code map

### 3.1. Khung chung (mọi công cụ đi qua)

| Tầng | File |
| --- | --- |
| Route (hai nhánh `/doc-tools`, `/tools`), nối màn | `src/routes/tools.routes.tsx` (`TOOL_SCREENS`) |
| Danh mục, nhóm, chip lọc | `hub/config/tool-catalog.ts` · `hub/types/tool.types.ts` |
| Tra slug, lọc, tìm kiếm | `hub/utils/tool-lookup.ts` (`resolveToolRoute`, `filterTools`) |
| Vỏ một công cụ, chặn trình duyệt cũ, ghi "dùng gần đây", đếm lượt mở | `hub/pages/ToolRoutePage.tsx` · `hub/utils/browser-support.ts` · `hub/utils/hub-prefs.ts` · `hub/hooks/useRecordToolVisit.ts` |
| Luồng ba bước (chọn tệp → chạy → kết quả) | `hub/components/flow/*` · `hub/hooks/useFlowRun.ts` · `hub/types/flow.types.ts` |
| Khung công cụ không cần tệp | `hub/components/board/*` |
| Bộ đếm | `hub/services/tool-visits.service.ts` → Drupal `erp_tools` |

### 3.2. Nhóm PDF (`pdf/`)

| Tầng | File |
| --- | --- |
| Vỏ công cụ nhanh | `components/quick/QuickToolShell.tsx` · `hooks/useQuickSources.ts` |
| Nạp tệp, kiểm loại theo chữ ký byte, trần | `services/ingest.ts` · `utils/file-guard.ts` |
| PDF mật khẩu | `services/pdf-unlock.ts` · `services/qpdf.ts` · `hooks/useUnlockQueue.ts` |
| Việc của từng công cụ nhanh | `services/quick-tasks.ts` (`mergeTask`, `splitTask`, `compressTask`, `convertTask`, `ocrTask`, `imagesToPdfTask`) |
| Dựng tệp ra | `services/doc-build.ts` (`buildPdf`, `buildSplit`, `buildImages`, `buildOffice`, `buildBatch`) → `services/pdf-assemble.ts` |
| Ghép giữ form / link / layer / đính kèm, gộp đối tượng trùng | `services/pdf-carryover.ts` · `services/pdf-dedupe.ts` |
| Nén | `services/pdf-compress.ts` · `utils/compression.ts` |
| PDF → ảnh / Word / Excel | `services/pdf-to-image.ts` · `services/pdf-to-office.ts` |
| OCR | `services/ocr.ts` · `services/ocr-store.ts` · `services/pdf-ocr-layer.ts` · `utils/ocr-runs.ts` |
| Vẽ trang, lớp chữ, ảnh thu nhỏ | `services/pdf-render.ts` · `services/text-layer.ts` · `services/thumbnails.ts` |
| Trình chỉnh sửa: trạng thái + xuất | `hooks/useDocWorkspace.ts` · `utils/workspace-reducer.ts` · `utils/page-ops.ts` · `hooks/useDocExport.ts` |
| Trình chỉnh sửa: sửa trang, sửa chữ, form, dọn bản scan | `services/page-edit.ts` · `services/text-reflow.ts` (+ `pdfium.ts`) · `services/pdf-form.ts` · `services/scan-cleanup.ts` |
| Trình chỉnh sửa: đánh dấu, xoá thật, số trang / watermark | `services/pdf-markup.ts` · `services/pdf-annotate.ts` · `services/pdf-redact.ts` · `services/pdf-decorate.ts` |
| Zip, tải về | `utils/download.ts` |
| Chuyển tệp sang trình chỉnh sửa ("Sửa tiếp") | `services/handoff.ts` (ô nhớ trong RAM) |

### 3.3. Nhóm ảnh, QR, tiện ích

| Tầng | File |
| --- | --- |
| Ảnh — vỏ, nạp tệp, kiểm chữ ký byte | `image/components/ImageToolShell.tsx` · `image/hooks/useImageFiles.ts` · `image/services/image-intake.ts` · `hub/utils/image-header.ts` |
| Ảnh — giải mã / mã hoá, việc cần làm | `image/services/image-codec.ts` · `image/services/image-tasks.ts` · `image/services/edit-tasks.ts` · `crop-render.ts` · `measure-render.ts` |
| Ảnh — zip, tên tệp | `shared/utils/zip.ts` · `shared/utils/file-names.ts` · `image/utils/image-format.ts` |
| Camera | `image/components/CameraCapture.tsx` · `image/hooks/useCamera.ts` · `hub/utils/camera-error.ts` |
| QR | `qr/utils/{qr-payload,qr-matrix,qr-file-name,scan-content}.ts` · `qr/services/{qr-render,qr-scan}.ts` · `qr/hooks/useQrScanner.ts` · `qr/config/qr-colors.ts` |
| Tiện ích | `utility/utils/{calc,money,date-calc,unit-convert,text-stats,color,random-code,notes}.ts` · `utility/config/{calc-formulas,money-presets,units}.ts` · `utility/services/notes-store.ts` · `utility/hooks/useNotes.ts` |

## 4. Engine dùng chung và chỗ trùng lặp (đầu vào cho G2)

### 4.1. Engine hiện có

| Engine (theo v2.0 §7) | Hiện trạng | Công cụ đang dùng |
| --- | --- | --- |
| PDF | **Một engine**: `pdf-assemble` + `doc-build`. Trình chỉnh sửa và 7 công cụ nhanh dùng chung, không có bản thứ hai | scan-to-pdf, merge, split, compress, convert-file, view / edit, ocr |
| OCR / Text | **Một engine**: `recognizePage` (`pdf/services/ocr.ts`). `ocr`, `image-to-text` và OCR trong trình chỉnh sửa gọi cùng hàm — yêu cầu MERGE của v2.0 §19 đã đạt sẵn | ocr, image-to-text, view / edit |
| Image | Một engine cho 7 công cụ ảnh (`image-codec` + `image-tasks` / `batch-tasks` / `edit-tasks`). **Tách rời** phần xử lý ảnh bên trong `pdf/` | convert-image, compress-image, crop-image, measure-image, batch-image, mark-image, id-photo |
| QR | Một engine (`qr/`) | qr-create, barcode-create, qr-read |
| Calculation | `utility/utils/calc.ts` + bảng công thức (hình học); `utility/utils/money.ts` + `money-presets.ts` (tiền — có `id` + `version` từng phép, từ 03/10/2026) | quick-calc, money-calc |
| Print | `image/utils/photo-layout.ts` + `image/services/photo-sheet.ts` (từ 03/10/2026): khổ giấy, bản sao, khoảng cách, lề, viền cắt, số đo mm → PDF (pt) / JPG 300 DPI. Chưa có crop marks kiểu vạch góc | id-photo |
| Time | `utility/utils/date-calc.ts` (từ 03/10/2026) — chưa có hồ sơ ngày nghỉ | date-calc |
| Data (CSV / XLSX) | **Chưa có**. `exceljs` đã nằm trong dự án (xuất Excel từ PDF) | — |
| Registry | `hub/config/tool-catalog.ts` — thiếu `processing_mode`, `priority`, `synonyms`, `quota`, `risk`, cờ riêng | mọi công cụ |

### 4.2. Trùng lặp giữa `pdf/` và `image/` / `hub/`

*(Cập nhật 03/10/2026: bảng dưới là hiện trạng LÚC KIỂM KÊ. Các dòng zip, khử tên
trùng, chữ ký byte, kích thước ảnh, trần, canvas → JPEG và tải tệp đã gộp vào
`tools/shared/` (+ `downloadOutput` của hub); chỉ còn dòng làm sạch tên tệp là
giữ hai bản có chủ ý.)*

| Thứ | Bên `pdf/` | Bên `image/` hoặc `hub/` | Khác nhau |
| --- | --- | --- | --- |
| Ghi .zip (fflate, không nén) | `pdf/utils/download.ts` (`createZipWriter`, `zipFiles`) | `image/utils/zip.ts` (`zipEntries`) | bản `pdf/` tự khử tên trùng |
| Khử tên tệp trùng | `pdf/utils/download.ts` `uniqueName` — phân biệt hoa thường | `image/utils/image-format.ts` `uniqueNames` — không phân biệt | **hành vi khác nhau** với `A.jpg` / `a.jpg` |
| Nhận loại tệp theo chữ ký byte | `pdf/utils/file-guard.ts` `detectKind` (PDF, JPG, PNG) | `hub/utils/image-header.ts` `detectImageFormat` (JPG, PNG, WebP, nhận ra HEIC) | bên `pdf/` không biết WebP |
| Đọc kích thước ảnh từ header | `pdf/utils/file-guard.ts` `readImageSize` | `hub/utils/image-header.ts` `readImageSize` | vòng lặp JPEG gần như giống hệt |
| Trần 100 MB · trần điểm ảnh | — | — | **đã gộp 03/10/2026** vào `hub/config/limits.ts` (`TOOL_LIMITS`) |
| Canvas → JPEG 0,92 | viết tại chỗ ở `ingest.ts`, `page-edit.ts`, `scan-cleanup.ts`, `pdf-to-image.ts`, `pdf-redact.ts` | `image/services/image-codec.ts` `encodeCanvas` | bên `pdf/` không dùng chung hàm |
| Tải tệp về | `pdf/utils/download.ts` `downloadBlob` | `hub/utils/flow-output.ts` `downloadOutput` | cùng cách |
| Làm sạch tên tệp | `pdf/utils/file-guard.ts` `sanitizeFileName` (120 ký tự) | `qr/utils/qr-file-name.ts` (40 ký tự) | luật khác nhau |

`doc-tools.md` ghi trùng lặp zip + header là **có chủ ý** (feature ảnh không được
kéo pdf.js vào gói của nó). Gộp hay giữ là quyết định của G2 / G3.

## 5. Thư viện

| Thư viện | Phiên bản (`package.json`) | Dùng cho | Cách nạp | Trong precache SW |
| --- | --- | --- | --- | --- |
| `pdfjs-dist` | ^6.2.108 | vẽ trang, lớp chữ | tĩnh trong chunk của 13 màn PDF; **cấm** trên đường khởi động (`startupGuard`) | có |
| `pdf-lib` | ^1.17.1 | dựng / ghép / sửa PDF | tĩnh trong chunk màn PDF | có |
| `@pdf-lib/fontkit` | ^1.1.1 | nhúng phông (lớp chữ OCR, số trang, dấu, sửa chữ) | `import()` | không |
| `@embedpdf/pdfium` | 2.15.1 | sửa chữ viết lại trang (chỉ trình chỉnh sửa) | `import()` + `pdfium.wasm` | không |
| `@neslinesli93/qpdf-wasm` | 0.3.0 | mở PDF mật khẩu | `import()` + wasm, chỉ khi gặp tệp mã hoá | wasm: không |
| `tesseract.js` / `tesseract.js-core` | ^7.0.0 | OCR | `import()`; dữ liệu `vie` ở `public/vendor/tesseract/vie.traineddata.gz` (1,4 MB) | không |
| `docx` | ^9.8.1 | PDF → Word | `import()` | không |
| `exceljs` | ^4.4.0 | PDF → Excel | `import()` | không |
| `fflate` | ^0.8.3 | ghi .zip | tĩnh | có |
| `qrcode` | ^1.5.4 | tạo mã QR | tĩnh trong chunk màn QR | có |
| `@zxing/browser` / `@zxing/library` | ^0.2.1 / ^0.23.0 | đọc mã QR / mã vạch | tĩnh trong chunk màn QR | có |

Giấy phép của từng thư viện: đã soát theo trường `license` của 151 gói trong
cây phụ thuộc ngày 03/10/2026 — xem [doc-tools-governance.md](doc-tools-governance.md)
mục 2 (bản nháp, chưa có ý kiến pháp chế, còn 6 việc thiếu).

## 6. Lưu trữ, giới hạn, quyền trình duyệt, mạng

### 6.1. Lưu trữ phía trình duyệt

| Kho | Khoá | Nội dung | Ở đâu |
| --- | --- | --- | --- |
| `localStorage` | `erpcons.tools.recent` | tối đa 5 slug dùng gần đây | `hub/utils/hub-prefs.ts` |
| `localStorage` | `erpcons.tools.view` | `grid` / `list` | `hub/utils/hub-prefs.ts` |
| `localStorage` | `erpcons.tools.notes` | toàn bộ ghi chú (JSON thường) | `utility/services/notes-store.ts` |
| `sessionStorage` | `erpcons.tools.visit.<slug>` | mốc giờ lượt đếm gần nhất | `hub/hooks/useRecordToolVisit.ts` |

IndexedDB và Cache API: không công cụ nào dùng (tesseract bị tắt cache:
`cacheMethod: 'none'`). Tệp người dùng, kết quả OCR, kết quả dựng: chỉ trong RAM.
Lưu trữ phía máy chủ, tệp tạm, TTL, job xoá: **không có**.

### 6.2. Giới hạn (Limit Matrix AS-IS)

*(Cập nhật 03/10/2026: các trần đầu vào đã gom về `hub/config/limits.ts` —
`TOOL_LIMITS` — kèm ba trần mới: 100 tệp / lượt, tổng 300 MB cho công cụ giữ mọi
tệp trong RAM, 50 triệu điểm ảnh trên thiết bị cảm ứng; tệp ra trên 100 MB có
cảnh báo. Bảng dưới là hiện trạng LÚC KIỂM KÊ, giữ làm bối cảnh; bảng đang
hiệu lực ở `doc-tools.md` mục "Giới hạn cứng".)*

Mọi con số dưới đây **viết cứng trong code**; v2.0 §10 yêu cầu đọc từ config.

| Tài nguyên (v2.0 §10) | Giá trị hiện tại | Hằng / file |
| --- | --- | --- |
| PDF MB | 100 MB / tệp | `MAX_FILE_BYTES` — `pdf/utils/file-guard.ts` |
| PDF pages | 500 trang / phiên (cả công cụ nhanh lẫn trình chỉnh sửa) | `MAX_TOTAL_PAGES` — `pdf/utils/file-guard.ts` |
| Image MB | 100 MB / ảnh | `MAX_IMAGE_BYTES` — `image/services/image-intake.ts` |
| Image MP | 80 triệu điểm ảnh, đọc từ header trước khi giải mã | `MAX_IMAGE_PIXELS` — hai bản (mục 4.2) |
| Canvas khi vẽ / xuất | cạnh 8000, 16 triệu điểm ảnh; vượt thì hạ DPI và báo DPI thật | `CANVAS_CAP` — `pdf/utils/canvas-cap.ts` |
| Batch (số tệp) | **không có trần**. PDF chỉ bị chặn gián tiếp bởi 500 trang; công cụ ảnh và đọc QR không chặn gì | — |
| ZIP MB | **không có trần** | — |
| Timeout | **không có**; người dùng tự bấm huỷ (`AbortSignal`) | — |
| Concurrency | ảnh thu nhỏ 3 luồng; còn lại tuần tự | `MAX_CONCURRENT` — `pdf/services/thumbnails.ts` |
| TTL | không áp dụng (không lưu máy chủ) | — |

Giới hạn riêng từng công cụ: tìm kiếm 1000 kết quả · hoàn tác 100 bước · xoá thật
200 DPI · OCR 300 DPI, bỏ từ dưới độ tin 30 · camera 50 ảnh / lượt · mật khẩu 20
/ lượt, mã 100 / lượt · ghi chú 200 mục, 20.000 ký tự, 100 việc.

**Lỗ hổng trần đã thấy:** `qr-read` **không qua** bộ kiểm của công cụ ảnh
(`intakeImage`) — không có trần dung lượng, không có trần điểm ảnh
(`qr/services/qr-scan.ts` giải mã thẳng tệp).

### 6.3. Quyền và API trình duyệt

| API | Công cụ | Ghi chú |
| --- | --- | --- |
| `getUserMedia` (camera) | scan-to-pdf, qr-read | chỉ chạy ở secure context |
| Local Font Access (`queryLocalFonts`) | view / edit (sửa chữ) | Chrome / Edge máy tính, hỏi quyền một lần |
| `EyeDropper` | color | Chrome / Edge; nút ẩn khi không hỗ trợ |
| Clipboard ghi | mọi công cụ có nút chép | qua `hub/utils/clipboard.ts`; riêng `hub/components/flow/FlowResult.tsx` gọi thẳng `navigator.clipboard.writeText`, không có đường lùi |
| Clipboard đọc (sự kiện dán) | qr-read | chỉ đọc tệp ảnh trong sự kiện `paste` |
| `navigator.share` | màn kết quả luồng ba bước | chỉ khi `canShare({ files })` nhận |
| `crypto.getRandomValues` | random-code | |

### 6.4. Mạng

| Lệnh gọi | Khi nào | Gửi gì |
| --- | --- | --- |
| `POST tools/visits` | mở một công cụ `ready`, cả hai nhánh; cùng tab cùng công cụ trong 10 phút không gửi lại | chỉ slug |
| `GET tools/stats` | trang chọn công cụ | không gửi gì |
| Tải tài nguyên của chính app | khi dùng | worker pdf.js, wasm (qpdf, PDFium), worker + lõi + dữ liệu `vie` của tesseract, phông TTF — cùng origin |

Cả hai lệnh gọi mang `skipSessionExpired`; `tools/visits` thêm `skipOutbox`.
Phía Drupal (`erp_tools`: không CSRF, flood 120 lượt / giờ / IP): theo
`doc-tools.md`, **chưa kiểm lại trong lượt này** (ngoài repo).

## 7. Test

### 7.1. Test tự động (`npm test`, logic thuần)

56 file `*.test.ts`: `pdf/` 40 · `image/` 6 · `hub/` 5 · `utility/` 3 · `qr/` 2.

| Vùng | Có test | **Không** có test |
| --- | --- | --- |
| `pdf/` | 36 file `utils/` + `pdf-carryover`, `pdf-dedupe`, `pdf-form`, `pdf-unlock` | `quick-tasks`, `doc-build`, `pdf-assemble`, `ingest`, `ocr`, `pdf-to-office`, `pdf-compress`, `pdf-redact`; mọi hook, component, trang |
| `image/` | `adjust`, `crop-rect`, `crop-state`, `image-format`, `image-header`, `measure` | `image-tasks`, `image-codec`, `image-intake`, `zip`, camera |
| `qr/` | `qr-matrix`, `qr-payload` (gồm `readScanContent`, `qrFileName`) | `qr-scan`, `useQrScanner` |
| `utility/` | `calc` (gồm đổi đơn vị), `random-notes`, `text-color` | `notes-store` |
| `hub/` | `browser-support`, `flow-output`, `hub-prefs`, `number-input`, `tool-lookup` | `useFlowRun`, `useRecordToolVisit`, `tool-visits.service`, `clipboard`, `camera-error` |

Vitest chỉ chạy môi trường `node` nên mọi thứ chạm canvas, worker, wasm đều nằm
ngoài test tự động — đó là lý do các tầng "dựng tệp" không có test đơn vị.

### 7.2. Script kiểm đầu-cuối (`scripts/doc-tools/`, chạy tay, không trong CI)

| Công cụ | Script phủ |
| --- | --- |
| merge, split, compress, convert-file, ocr, image-to-text, scan-to-pdf | `check-flows` (+ `check-office`, `check-ocr`, `check-password`, `check-carryover`) |
| view / edit | `check-search`, `check-text-edit`, `check-text-reflow`, `check-form-spill`, `check-column-zones`, `check-markup*`, `check-textbox-resize`, `check-image-pages`, `check-compress-annot`, `check-form-fill`, `check-redaction`, `check-scan-cleanup`, `check-batch`, `check-limits`, `check-suggestions`, `check-layout-narrow` |
| 4 công cụ ảnh + camera | `check-image-tools` |
| batch-image, mark-image, id-photo | `check-image-extra` |
| sign, compare | `check-sign-compare` |
| cả 33 công cụ trên nhánh `/tools` (trong khung app) | `check-app-branch` |
| qr-create, qr-read, 6 tiện ích | `check-utility-tools` |
| money-calc, date-calc, QR vCard | `check-money-date` |
| Trang chọn, hai nhánh route, slug | `check-tool-routes` |
| Hiệu năng theo số trang | `measure-pages` |
| Service worker | `check-service-worker` |
| EXIF / GPS trong tệp ra (G1) | `check-exif` |
| Network QA cả 21 công cụ (G1) | `check-network` |
| Golden baseline cả 21 công cụ (G1) | `golden` + `golden/baseline.json` |

Các script `check-*` in JSON và **không tự đánh trượt**; riêng `golden` thoát
mã 1 khi kết quả lệch baseline.

### 7.3. Network QA — kết quả ngày 03/10/2026

`check-network.mjs` mở và chạy thật cả 21 công cụ với tệp / nội dung mang chuỗi
đánh dấu, ghi mọi request của trang (kể cả từ worker), rồi soi: lệnh ghi ngoài
bộ đếm, request ra origin khác, thân request > 200 B, chuỗi đánh dấu hoặc tên
tệp trong URL / thân request, websocket.

| Môi trường | Kết quả |
| --- | --- |
| Dev (`localhost:3000`) | 21 / 21 chạy xong, 21 / 21 sạch |
| Bản production (`vite preview`, `/erpcons/`) | 21 / 21 chạy xong, 21 / 21 sạch, 0 websocket |

Lệnh gọi API duy nhất quan sát được: `GET …/api/v1/me` (hỏi phiên) và
`POST …/api/v1/tools/visits` với thân đúng bằng `{"tool":"<slug>"}`. Bộ soi đã
được thử ngược (`SELFTEST=1`: tự bắn một request mang chuỗi đánh dấu và một
request ra origin khác → mọi cờ đều bật), và sổ ghi thấy cả request của worker
(`vie.traineddata.gz`, worker + lõi tesseract, worker pdf.js).

Giới hạn của bằng chứng này: mỗi công cụ chỉ chạy **một đường chính** (không
phủ PDF mật khẩu, sửa chữ bằng PDFium, xuất Excel, camera, "Sửa tiếp", chia
sẻ); chỉ Chrome máy tính; nhánh công khai với tư cách khách; bản production là
bản build lúc 13:45 ngày 03/10/2026, chạy không có Drupal phía sau.

### 7.4. Golden baseline — ghi ngày 03/10/2026

`golden.mjs` chạy thật 21 công cụ (23 mục: `convert-file` có ba đường Word /
Excel / JPG) với tệp mẫu và tuỳ chọn cố định, rút **chữ ký nội dung** của kết
quả rồi so với `scripts/doc-tools/golden/baseline.json` (đã commit; tệp mẫu nhị
phân thì không).

| Loại kết quả | Chữ ký được so |
| --- | --- |
| PDF | số trang, khổ + góc xoay, số ảnh nhúng, số trường form, chữ (giống ≥ 97%) |
| .zip | tên các tệp bên trong + chữ ký từng tệp |
| Ảnh | định dạng, kích thước, màu trung bình lưới 4 × 4 (lệch ≤ 8 mỗi kênh) |
| .docx / .xlsx | chữ rút ra; số sheet, số ô |
| .txt (OCR) | chữ (giống ≥ 97%) |
| Tiện ích không cần tệp | chuỗi kết quả trên màn hình; QR tạo rồi **đọc ngược lại**; mã ngẫu nhiên chỉ so hình dạng; ghi chú so dạng lưu trong `localStorage` |

Kết quả: ghi baseline 23 / 23; so lại hai lần liên tiếp 23 / 23 khớp (Chrome
154, dev). Đã thử ngược: sửa lệch baseline ở 3 mục → cả 3 báo `MISMATCH`, mã
thoát 1; sửa lệch chữ ký tệp đầu vào → báo `fixture-changed` chứ không báo hồi
quy.

Giới hạn: mỗi công cụ một đường chính với tuỳ chọn mặc định (trừ `convert-file`);
chỉ Chrome máy tính, một máy; dung sai chữ và màu là số chọn tay, chưa thử trên
bản Chrome khác; tệp mẫu sinh bằng Chrome in ra PDF nên đổi bản Chrome có thể
làm chữ ký đầu vào đổi (khi đó script báo `fixture-changed`, cần `UPDATE=1`).
Cột `info` (thời gian, dung lượng) chỉ tham khảo — benchmark ở mục 7.5, không phải ở đây. Không dùng cho
Limit Matrix: tệp mẫu nhỏ, không đo bộ nhớ.

### 7.5. Benchmark cho Limit Matrix — đo ngày 03/10/2026

`node scripts/doc-tools/bench-limits.mjs` — tăng dần cỡ đầu vào ở bảy công cụ
nặng, mỗi ca một Chrome mới. Đo trên bản production (`vite preview`), Chrome
154 headless, máy dev **Core Ultra 9 275HX / 16 GB** — máy mạnh, không giả CPU
chậm. Cột bộ nhớ là tổng bộ nhớ riêng của các tiến trình con của Chrome
(renderer + GPU), lấy mẫu mỗi 0,5 s: mức lúc trang vừa mở → đỉnh.

| Công cụ | Ca | Vào (MB) | Chạy (s) | Ra (MB) | Bộ nhớ nghỉ → đỉnh (MB) |
| --- | --- | --- | --- | --- | --- |
| `compress-image` | 10 ảnh 12 MP | 34 | 3,0 | 14 | 359 → 1023 |
| | 25 ảnh | 84 | 6,1 | 34 | 352 → 1156 |
| | 50 ảnh | 168 | 13,3 | 68 | 356 → 1104 |
| | 100 ảnh | 335 | 24,4 | 135 | 354 → 1162 |
| `convert-image` → WebP | 1 ảnh 12 MP | 3,4 | 1,4 | 3,0 | 361 → 755 |
| | 24 MP | 6,4 | 2,6 | 5,8 | 353 → 1049 |
| | 48 MP | 12 | 13,4 | 11 | 352 → 1652 |
| | 79 MP | 19 | 21,5 | 18 | 357 → **2041** |
| `scan-to-pdf` | 10 ảnh 12 MP | 34 | 0,9 | 34 | 365 → 516 |
| | 25 ảnh | 84 | 2,0 | 84 | 359 → 709 |
| | 50 ảnh | 168 | 4,1 | 168 | 359 → 957 |
| | 100 ảnh | 335 | 7,8 | 335 | 362 → **1928** |
| `merge-pdf` | 2 tệp × 10 MB | 19 | 0,1 | 19 | 364 → 521 |
| | 2 × 50 MB | 101 | 0,3 | 101 | 363 → 994 |
| | 2 × 95 MB | 192 | 1,0 | 192 | 363 → 1451 |
| `compress-pdf` | scan 25 MB (23 trang) | 25 | 2,0 | 10 | 358 → 997 |
| | 50 MB (47 trang) | 51 | 3,5 | 21 | 361 → 1257 |
| | 95 MB (89 trang) | 96 | 7,2 | 40 | 360 → 1334 |
| `ocr` | 5 ảnh chữ | 1 | 4,9 | 1 | 359 → 998 |
| | 10 ảnh | 2 | 9,6 | 2 | 360 → 1242 |
| | 20 ảnh | 4 | 18,3 | 4 | 358 → 1303 |
| `convert-file` → JPG | 50 trang | 0,1 | 1,9 | 11 | 359 → 515 |
| | 200 trang | 0,2 | 5,5 | 43 | 359 → 524 |
| | 500 trang | 0,5 | 13,6 | 110 | 358 → 555 |

Cả 23 ca chạy xong, không ca nào bị từ chối, lỗi, hết giờ hay làm chết tab —
tức là **chưa tìm ra điểm gãy** trên máy này. Đọc số:

- **Hai kiểu tăng bộ nhớ.** Công cụ xử lý từng tệp rồi nhả (`compress-image`,
  `compress-pdf`, `convert-file`, `ocr`) giữ đỉnh gần như phẳng dù đầu vào tăng
  10 lần. Công cụ phải giữ MỌI tệp trong RAM cùng lúc (`scan-to-pdf`,
  `merge-pdf`) tăng tuyến tính: khoảng 4,7 lần dung lượng vào ở `scan-to-pdf`,
  5,7 lần ở `merge-pdf`.
- **`scan-to-pdf` là chỗ thiếu trần rõ nhất**: 100 ảnh điện thoại ra tệp 335 MB
  và ngốn gần 2 GB, mà không có trần số tệp hay trần tổng dung lượng (chỉ có
  100 MB mỗi tệp và 500 trang).
  *(Sau khi đặt trần 03/10/2026, đo lại cùng máy: lô 100 ảnh chỉ nhận 89 ảnh
  — 11 ảnh bị từ chối kèm lý do "Tổng dung lượng vượt 300 MB" — tệp ra 298 MB,
  đỉnh bộ nhớ 1,42 GB thay vì 1,9 GB. Ảnh 79 MP bị từ chối trên thiết bị cảm
  ứng (trần 50 triệu điểm ảnh); ghép ra tệp trên 100 MB có cảnh báo.)*
- **Một ảnh 79 MP — ngay dưới trần 80 triệu điểm ảnh — cần 2 GB và 21 s.** Thời
  gian nhảy bậc giữa 24 và 48 MP (2,6 s → 13,4 s). Trần 80 MP hiện tại là quá
  cao cho điện thoại.
- **Kết quả vượt chính trần đầu vào**: ghép hai tệp 95 MB ra 192 MB, PDF 500
  trang ra .zip 110 MB — tệp ra không nạp lại được vào công cụ (trần 100 MB).
- **Thời gian tuyến tính**: nén ảnh ~0,25 s / ảnh 12 MP, nén PDF scan ~0,08 s /
  trang, OCR ~0,95 s / ảnh, PDF → JPG ~0,03 s / trang. Ca lâu nhất 24 s — trên
  máy này không ca nào cần tới timeout.
- JS heap đỉnh chỉ 15–28 MB ở mọi ca: bộ nhớ thật nằm ngoài heap (ArrayBuffer,
  canvas, WASM). **Đừng dùng JS heap để đặt trần.**

Giới hạn của phép đo: một máy mạnh, Chrome máy tính; chưa đo máy RAM 4 GB,
điện thoại, Safari; ảnh mẫu là ảnh vẽ (12 MP ≈ 3,4 MB), ảnh chụp thật có thể
nặng hơn; lấy mẫu 0,5 s có thể hụt đỉnh ngắn; chưa đo trình chỉnh sửa (đã có ở
`doc-tools.md` mục Hiệu năng).

#### Bổ sung 03/10/2026 (lượt 2): PDF → Word / Excel, OCR trên PDF nhiều trang

Cùng máy, cùng cách đo, bản production của commit `7529742b`.

| Công cụ | Ca | Vào (MB) | Chạy (s) | Ra (MB) | Bộ nhớ nghỉ → đỉnh (MB) |
| --- | --- | --- | --- | --- | --- |
| `convert-file` → Word | 50 trang | 0,1 | 0,4 | < 0,1 | 350 → 439 |
| | 200 trang | 0,2 | 0,9 | 0,1 | 351 → 541 |
| | 500 trang | 0,5 | 1,9 | 0,1 | 353 → 692 |
| `convert-file` → Excel | 20 trang bảng | 0,1 | 0,3 | < 0,1 | 359 → 394 |
| | 100 trang bảng | 0,1 | 0,9 | 0,1 | 361 → 490 |
| | 300 trang bảng | 0,1 | 1,4 | 0,3 | 350 → 609 |
| `ocr` → PDF tìm được chữ | PDF scan 5 trang | 5,4 | 13,7 | 5,4 | 360 → 948 |
| | 20 trang | 22 | 49,9 | 22 | 362 → 1124 |
| | 50 trang | 54 | **120,8** | 54 | 359 → 1368 |

- **PDF → Word / Excel nhẹ**: 500 trang chữ ra Word trong 1,9 s, đỉnh 692 MB.
  Riêng Word là công cụ duy nhất có JS heap lớn (174 MB ở 500 trang) — cả tài
  liệu dựng trong heap trước khi ghi. Tệp đo là PDF chữ thuần; PDF nhiều ảnh
  chưa đo.
- **OCR PDF scan là việc chậm nhất của cả bộ: ~2,4 s / trang** (trang A4 200
  DPI), tuyến tính. 50 trang mất 2 phút; trần 500 trang nghĩa là một lượt OCR
  có thể chạy **20 phút** trên máy mạnh. Bộ nhớ tăng chậm (1,37 GB ở 50 trang).
  Không có trần trang riêng cho OCR và không có ước lượng thời gian trước khi
  chạy — đề xuất đặt một trong hai.

#### Giả máy yếu: CPU chậm 4× (`CPU=4`)

`CPU=4` chỉ làm chậm **luồng chính** của trang; việc trong worker (pdf.js đọc
trang, tesseract, WASM) không chậm theo. Số dưới đây là **cận dưới** của máy
yếu thật với công cụ dồn việc vào worker (OCR), và gần đúng với công cụ làm
việc trên luồng chính (canvas, dựng Word / Excel). Trong một phần lượt đo có
một script kiểm khác (mở trang, không xử lý tệp) chạy song song trên cùng máy.

| Công cụ | Ca | CPU 1× (s) | CPU 4× (s) | Gấp | Đỉnh bộ nhớ 4× (MB) |
| --- | --- | --- | --- | --- | --- |
| `compress-image` | 10 ảnh 12 MP | 3,0 | 9,2 | 3,1 | 1187 |
| | 50 ảnh | 13,3 | 49,8 | 3,7 | 1157 |
| `convert-image` → WebP | 12 MP | 1,4 | 1,7 | 1,2 | 721 |
| | 24 MP | 2,6 | 3,6 | 1,4 | 1055 |
| `scan-to-pdf` | 10 ảnh 12 MP | 0,9 | 1,5 | 1,7 | 528 |
| | 50 ảnh | 4,1 | 7,7 | 1,9 | 1170 |
| `merge-pdf` | 2 × 10 MB | 0,1 | 0,3 | 3 | 568 |
| | 2 × 50 MB | 0,3 | 1,6 | 5,3 | 966 |
| `compress-pdf` | scan 25 MB (23 trang) | 2,0 | 5,8 | 2,9 | 1080 |
| `ocr` | 5 ảnh chữ | 4,9 | 11,1 | 2,3 | 970 |
| | PDF scan 5 trang | 13,7 | 19,7 | 1,4 | 940 |
| | PDF scan 20 trang | 49,9 | 86,0 | 1,7 | 1052 |
| `convert-file` → JPG | 50 trang | 1,9 | 13,4 | **7,1** | 501 |
| | 200 trang | 5,5 | 33,8 | 6,1 | 533 |
| `convert-file` → Word | 50 trang | 0,4 | 2,3 | 5,8 | 440 |
| | 200 trang | 0,9 | 6,4 | 7,1 | 561 |
| | 500 trang | 1,9 | 11,4 | 6,0 | 704 |
| `convert-file` → Excel | 20 trang bảng | 0,3 | 1,5 | 5 | 417 |
| | 100 trang bảng | 0,9 | 3,0 | 3,3 | 473 |

Cả 19 ca chạy xong, không ca nào lỗi, hết giờ hay chết tab. Đọc số:

- **Bộ nhớ không đổi theo tốc độ CPU** — máy yếu gãy vì RAM chứ không vì CPU,
  mà RAM thì phép đo này không giả được.
- **PDF → JPG và PDF → Word chậm vượt hệ số 4** (6–7 lần): việc nằm trọn trên
  luồng chính. 200 trang ra JPG mất 34 s; suy ra 500 trang khoảng 1,5 phút trên
  máy yếu — vẫn chạy được nhưng giao diện phải còn bấm được nút Huỷ *(chưa kiểm
  độ trễ của nút Huỷ khi CPU chậm)*.
- **OCR 20 trang: 86 s dù tesseract không bị làm chậm** — máy yếu thật sẽ lâu
  hơn đáng kể; coi 86 s là cận dưới.
- Chưa có ca nào cần tới timeout; đề xuất cho Limit Matrix vẫn là **không đặt
  timeout cứng**, thay bằng trần trang riêng cho OCR.

## 8. Lệch so với spec và điểm cần quyết (mang sang G1–G3)

Đề xuất xử lý từng điểm (gộp hay giữ, KEEP / FIX / EXTEND) nằm ở
[doc-tools-decisions.md](doc-tools-decisions.md) — bản nháp G2 + G3, chưa ký.

**Về quyền riêng tư**

1. **"0 AI".** OCR chạy `OEM.LSTM_ONLY` — lõi nhận dạng của tesseract là mạng
   nơ-ron nhỏ chạy cục bộ. Không LLM, không token, không gửi dữ liệu đi. Cần
   chốt định nghĩa "0 AI/LLM/token" có bao gồm mô hình cục bộ kiểu này không.
2. *(Cập nhật 03/10/2026: chủ dự án chốt GIỮ EXIF — lệch có chủ ý so với v2.0
   §13. Nén / cắt / đo ra JPG giờ mang EXIF sang; câu "không còn GPS" đã sửa.
   Phần dưới là hiện trạng lúc đo, giữ làm bối cảnh.)*
   **EXIF / GPS còn giữ ở bốn đường** (v2.0 §13: gỡ mặc định) — **đã xác nhận
   bằng tệp thật** ngày 03/10/2026 (`check-exif.mjs`, JPEG mang toạ độ GPS, soi
   byte tệp tải về):
   - `convert-image`: ảnh đã đúng định dạng đích → trả nguyên byte gốc, GPS còn.
   - `compress-image`: bản nén không nhẹ hơn → trả nguyên tệp gốc, GPS còn.
   - `scan-to-pdf`: JPEG hướng chuẩn được nhúng **nguyên byte** vào PDF
     (`embedJpg(source.bytes)`) — khối EXIF + GPS nằm nguyên trong tệp PDF.
   - Trang ảnh trong trình chỉnh sửa, xuất PDF: như trên, GPS còn.
   - Đối chứng — EXIF mất đúng như dự kiến: chuyển sang định dạng khác, nén ra
     bản nhẹ hơn, cắt & chỉnh.
   - **Màn kết quả nói sai ở lô lẫn lộn**: nén 2 ảnh mà 1 ảnh giữ tệp gốc thì
     vẫn hiện "Ảnh ra không còn thông tin kèm theo của máy ảnh (ngày chụp, vị
     trí GPS)" — trong khi ảnh giữ tệp gốc trong .zip còn nguyên GPS.
   - Chưa kiểm: JPEG có hướng EXIF khác 1 (bước nạp của `pdf/` vẽ lại qua
     canvas nên dự kiến mất EXIF), PNG / WebP mang metadata. *(Đã làm và kiểm
     03/10/2026: cả hai đều giữ; thêm Nén PDF. Chỉ ra WebP là mất.)*
   Gỡ metadata hiện chỉ là **tác dụng phụ** của việc mã hoá lại qua canvas, không
   có đoạn code nào chủ động gỡ.
3. **Tệp đính kèm và layer của PDF nguồn đi theo khi ghép** (`pdf-carryover`) —
   đúng thiết kế, nhưng là điểm cần nêu trong privacy review.
4. **XMP / `/Metadata`**: không code nào chép hay gỡ chủ động; có đi theo
   `copyPages` hay không là `UNKNOWN`. Info dict thì tệp ra chỉ có Producer /
   Creator "ERPCons DocTools" (+ Title), không chép Author của nguồn.
5. Hai comment trong code nói "không gọi API" (`hub/pages/ToolsHubPage.tsx`,
   `src/routes/tools.routes.tsx`) trong khi có `tools/visits` và `tools/stats` —
   câu chữ cần sửa cho khớp khi được phép sửa code. *(Đã sửa 03/10/2026.)*

**Về hợp đồng v2.0**

6. **State machine** (§9): hiện là `idle | running | done`, lỗi = `idle` kèm
   chuỗi thông báo. Không có `VALIDATING`, `PREVIEW`, `EXPORTING`,
   `CANCELLED`, `QUOTA_BLOCKED`, `UNSUPPORTED`.
7. **Mã lỗi** (§9): không có mã nào — toàn chuỗi tiếng Việt tự do. *(Đã làm 03/10/2026: 11 mã ở `hub/utils/tool-error.ts`, gắn vào mọi lời từ chối và lượt chạy hỏng của khung luồng; state machine vẫn ba trạng thái.)*
8. **Limit Matrix** (§10): viết cứng; thiếu hẳn trần batch, trần zip, timeout.
9. **Registry** (§4): thiếu `processing_mode`, `engine_ids`, `quota`, `risk`,
   `flag` riêng, `analytics`, `owner`.
10. **Tìm kiếm** (v1.0 §11): khớp bỏ dấu trên tên + mô tả, mọi từ phải có;
    không có từ điển đồng nghĩa, không ghi truy vấn không ra kết quả.
11. **Trang chủ** (v1.0 §10): hiện cả 24 thẻ, chưa có Top 12 cấu hình được. *(Đã làm 03/10/2026: `priority` trong danh mục + nút "Xem tất cả"; ô tìm khớp `synonyms`.)*
12. **Category** (v1.0 §9): bộ nhóm đang chạy theo quyết định ngày 03/10/2026
    (mục "Nhóm chia theo VIỆC" trong `doc-tools.md`), khác 9 category của spec.
13. **`quick-calc`** hiện là diện tích / thể tích / khối lượng thép — sát ranh
    với "Công cụ Xây dựng" (v1.0 §12 cấm trộn). Chưa có preset %, VAT, margin.
    *(Đã làm 03/10/2026: preset tiền ở công cụ riêng `money-calc`, `quick-calc` giữ nguyên.)*

**Về công cụ**

14. P0 đã có engine trong trình chỉnh sửa, **chưa có công cụ riêng**: sắp xếp
    trang (xoay / xoá / đổi thứ tự), PDF → ảnh (đã có trong `convert-file` và
    xuất của trình chỉnh sửa), đánh số trang (6 vị trí, mẫu `{n}` `{N}` `{date}`
    `{file}`, số bắt đầu, phạm vi trang; **không** có số La Mã / chữ cái), đóng
    dấu (5 dấu chữ cố định + watermark chữ; **không** có dấu ảnh / logo), xoá
    thật trên PDF (vẽ lại trang 200 DPI + lớp chữ ẩn chỉ giữ phần ngoài khung).
15. P0 chưa có gì: che / đóng dấu trên **ảnh**, ảnh hàng loạt đúng nghĩa (đổi
    tên, resize theo preset tự chọn), Ảnh thẻ & In ảnh, VAT / margin / chia tiền,
    ngày & thời hạn, QR vCard. *(Đã làm 03/10/2026: `money-calc`, `date-calc`,
    loại mã vCard; `batch-image`, `mark-image`, `id-photo`. Còn thiếu so với spec:
    đổi nền ảnh thẻ, gỡ metadata — cái sau là do quyết định giữ EXIF.)*
16. `sign`, `compare`: chỉ có thẻ, không có code (`postal-code` đã gỡ thẻ).
    *(Đã làm 03/10/2026. Còn thiếu: chữ ký số thật — ngoài phạm vi bản Free; so
    sánh mới ở mức dòng chữ, chưa có xem hai bản cạnh nhau.)*
17. Test khôi phục nội dung đã xoá (v2.0 §14: copy / search / extract): mới có
    `check-redaction` chạy tay; chưa là cổng tự động.

## 9. Chưa kiểm trong lượt G0 này

- Thân các file giao diện lớn của trình chỉnh sửa (`PageGrid`, `MarkupEditor`,
  `PagePreviewModal`, `SearchPanel`) và `pdf-form.ts`, `page-ops.ts` — chỉ soi
  import và chữ ký.
- Bên trong pdf-lib: byte JPEG có được giữ nguyên khi nhúng, ngày tạo mặc định.
- Module Drupal `erp_tools`.
- Chưa chạy lại script nào trong `scripts/doc-tools/` — bảng 7.2 lấy từ
  `doc-tools.md`.
- Giấy phép thư viện.
