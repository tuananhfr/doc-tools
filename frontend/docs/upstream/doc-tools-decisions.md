# Chuyện Nhỏ — Reuse map (G2) và ma trận quyết định (G3)

> **BẢN NHÁP — chưa ai ký.** Gate G3 của "ERPCons Chuyện Nhỏ FINAL v2.0" chỉ
> PASS khi CTO và BA ký. Mọi quyết định dưới đây là **đề xuất của bên dev**, lập
> ngày 03/10/2026 từ kết quả G0–G1 ([doc-tools-registry.md](doc-tools-registry.md)).
> Cỡ việc (S / M / L) là ước lượng thô, chưa phải cam kết.

Thuật ngữ quyết định theo v2.0 §6: KEEP (giữ) · FIX (sửa tối thiểu + test hồi
quy) · EXTEND (mở rộng engine có sẵn) · MERGE (một engine, giữ route cũ) ·
REFACTOR (golden trước) · NEW (chỉ khi không dùng lại được) · RETIRE.

Cổng hồi quy cho mọi dòng: `node scripts/doc-tools/golden.mjs` phải khớp trước
và sau khi sửa (thay đổi có chủ ý thì `UPDATE=1` và ghi lý do trong commit).

## 1. Reuse map (G2)

### 1.1. Engine nào nuôi công cụ nào

| Engine | Đang nuôi | Sẽ nuôi (P0 của spec) | Thiếu gì |
| --- | --- | --- | --- |
| **PDF** (`pdf-assemble` + `doc-build`) | 7 công cụ nhanh + trình chỉnh sửa | Sắp xếp PDF · PDF → Ảnh · Đánh số trang · Đóng dấu PDF · Che thông tin PDF | Không thiếu engine — thiếu **màn riêng** cho từng việc |
| **OCR / Text** (`recognizePage`) | `ocr`, `image-to-text`, trình chỉnh sửa | — | Chỉ tiếng Việt |
| **Image** (`image-codec` + `image-tasks`) | 4 công cụ ảnh | Ảnh hàng loạt · Che / đóng dấu trên ảnh · Ảnh thẻ · Xoá metadata | Resize theo kích thước tự chọn, đổi tên theo mẫu, vẽ đè (burn-in), gỡ EXIF chủ động |
| **Print** | — (gần nhất: `pdf/utils/image-sheet.ts`) | Ảnh thẻ & In ảnh | Bản sao, khoảng cách, crop marks, giữ đúng mm |
| **Calculation** (`utility/utils/calc.ts`) | `quick-calc` | % · VAT · chiết khấu · margin · markup · chia tiền | `preset_id`, `formula_version`, luật làm tròn |
| **Time** | — | Chênh lệch ngày · cộng / trừ ngày · ngày làm việc · thời hạn | Toàn bộ; hồ sơ ngày nghỉ có version |
| **QR** (`qr/`) | `qr-create`, `qr-read` | QR vCard · (P1) QR hàng loạt | Preset vCard |
| **Data** | — (`exceljs` đã có trong dự án) | (P1) CSV ↔ XLSX, xoá dòng trùng, tách / gộp | Toàn bộ |
| **Registry** (`tool-catalog.ts`) | mọi công cụ | cờ từng công cụ, Top 12, từ đồng nghĩa | `processing_mode`, `priority`, `synonyms`, `flag` |

Kết luận G2: **không có engine nào bị nhân đôi ở tầng nghiệp vụ** (PDF một bản,
OCR một bản). Trùng lặp chỉ nằm ở tiện ích tầng thấp giữa `pdf/` và `image/`.

### 1.2. Chỗ trùng lặp — đề xuất gộp hay giữ

| # | Thứ trùng | Đề xuất | Lý do | Rủi ro |
| --- | --- | --- | --- | --- |
| 1 | Ghi .zip (`pdf/utils/download.ts` ↔ `image/utils/zip.ts`) | **MERGE** về một bản dùng chung — **đã làm 03/10/2026** (`shared/utils/zip.ts`) | Cùng kỹ thuật (fflate, không nén). Công cụ P0 mới (ảnh hàng loạt, PDF → ảnh) lại cần thêm một bản nữa nếu không gộp | Thấp |
| 2 | Khử tên tệp trùng (phân biệt hoa thường ↔ không) | **MERGE** theo bản **không phân biệt** hoa thường — **đã làm 03/10/2026** (golden 23/23 không đổi) | `A.jpg` và `a.jpg` trong một .zip đè nhau khi giải nén trên Windows / macOS | Đổi hành vi phía PDF — golden phải ghi lại |
| 3 | Nhận loại tệp theo chữ ký byte | **MERGE** — **đã làm 03/10/2026**: bản của `image/` là tập cha (thêm WebP, nhận ra HEIC); `pdf/` giữ riêng phần nhận PDF | Một chỗ sửa khi thêm định dạng | Thấp |
| 4 | Đọc kích thước ảnh từ header | **MERGE** cùng mục 3 — **đã làm 03/10/2026** | Vòng lặp JPEG giống nhau từng dòng | Thấp |
| 5 | Trần 100 MB (hai hằng) | **MERGE** vào một bảng giới hạn đọc từ config — **đã làm 03/10/2026** (`hub/config/limits.ts`) | v2.0 §10 yêu cầu Limit Matrix không viết cứng — đằng nào cũng phải làm | Thấp |
| 6 | Trần 80 triệu điểm ảnh (hai hằng) | như mục 5 — **đã làm 03/10/2026** | như mục 5 | Thấp |
| 7 | Canvas → JPEG 0,92 (viết tại chỗ 5 nơi trong `pdf/`) | **REFACTOR**, làm sau cùng — **đã làm 03/10/2026** (`shared/utils/canvas-encode.ts`, 7 chỗ) | `encodeCanvas` của `image/` đã bắt hai lỗi câm (Safari trả PNG thay WebP, canvas vượt trần trả `null`) mà 5 chỗ kia không bắt | Trung bình — đụng đường xuất ảnh, xoá thật, dọn bản scan |
| 8 | Tải tệp về (`downloadBlob` ↔ `downloadOutput`) | **MERGE** về bản của hub — **đã làm 03/10/2026** | Giống nhau | Thấp |
| 9 | Làm sạch tên tệp (120 ↔ 40 ký tự) | **KEEP** | Hai luật khác nhau có chủ ý (tên tệp người dùng ↔ nhãn mã QR) | — |

**Câu hỏi kiến trúc phải chốt ở G4 trước khi gộp** — bản dùng chung đặt ở đâu *(đã làm theo phương án B ngày 03/10/2026; trần và mã lỗi ở lại hub vì khung luồng dùng)*:

- *Phương án A — đặt trong `hub/`.* Mọi feature công cụ đã import hub. Nhưng
  `hub/index.ts` được `routes/tools.routes.tsx` import tĩnh, tức nằm trên đường
  khởi động của app: thêm thư viện vào đó có thể kéo nó vào gói khởi động của
  **mọi** người dùng ERP. Chưa kiểm Rollup có loại được phần không dùng không.
- *Phương án B — feature mới `tools/shared/`* (zip, header ảnh, giới hạn, tải
  về), chỉ các chunk công cụ nạp lười mới kéo. Giữ được luật "hub không import
  feature khác" và không đụng đường khởi động. **Bên dev nghiêng về B.**

`doc-tools.md` ghi trùng lặp zip + header là có chủ ý, với lý do "feature ảnh
không được kéo pdf.js vào gói". Phương án B giữ nguyên được lý do đó.

## 2. Ma trận quyết định — 24 công cụ lúc kiểm kê (G3)

| tool_id | Quyết định | Việc cụ thể | Cỡ | Căn cứ |
| --- | --- | --- | --- | --- |
| `scan-to-pdf` | FIX | FIX — **đã làm 03/10/2026**: ảnh có cờ xoay bị vẽ lại lúc nạp nay chép EXIF sang, PDF còn ngày chụp + GPS như ảnh không xoay | S | G1; quyết định mục 5 câu 2 |
| `merge-pdf` | KEEP | — | — | Golden khớp, network sạch |
| `split-pdf` | KEEP | — | — | như trên |
| `compress-pdf` | KEEP | — | — | như trên |
| `convert-file` | **FIX** (nhãn) — **đã làm 03/10/2026** | Gắn nhãn Beta cho hướng PDF → Excel; ghi rõ "bố cục phức tạp chỉ gần đúng" | S | v2.0 §19: table → Excel beta |
| `view-pdf` | KEEP | — | — | Cùng màn với `edit-pdf` |
| `edit-pdf` | KEEP | — (như `scan-to-pdf`) | — | G1 |
| `ocr` | KEEP | — | — | MERGE của v2.0 §19 đã đạt sẵn: cùng `ocrTask` |
| `image-to-text` | KEEP | Giữ làm đường vào riêng (search intent khác), engine chung | — | như trên |
| `char-count` | KEEP | — | — | |
| `compare` | **NEW** — **đã làm 03/10/2026** (so dòng chữ, báo cáo .txt) | So chữ xác định (text diff), không AI; P1 theo v1.0 | L | v2.0 §19 |
| `sign` | **NEW** — **đã làm 03/10/2026** ("Chèn chữ ký") | Đổi tên thành "Chèn chữ ký", ghi rõ không phải chữ ký số; dùng lại nét bút tay của trình chỉnh sửa + chèn ảnh | M | v2.0 §19 |
| `measure-image` | KEEP | — | — | Đã đúng v2.0 §5: chưa có đoạn chuẩn thì chỉ báo px |
| `convert-image` | FIX — **đã làm 03/10/2026** | Ghi chú kết quả đếm theo từng ảnh còn / mất EXIF; ra JPG / PNG giữ (kể cả nguồn PNG / WebP), ra WebP là mất và nói rõ | S | G1 |
| `compress-image` | FIX — **đã làm 03/10/2026** | (1) Ảnh nén ra JPG mang EXIF của ảnh gốc sang; (2) câu "không còn GPS" sai ở lô lẫn lộn đã thay bằng ghi chú đếm theo từng ảnh | S | G1: thông báo sai về quyền riêng tư |
| `crop-image` | KEEP | — | — | |
| `color` | KEEP | Không ưu tiên (P3) | — | v1.0 §3 |
| `quick-calc` | **EXTEND** — **đã làm 03/10/2026** | Preset %, VAT, chiết khấu, margin, markup, chia tiền có `id` + `version` — đặt ở công cụ riêng `money-calc` (nhóm Tiền), `quick-calc` giữ phần hình học | M | v1.0 §5, v2.0 §15 |
| `unit-convert` | KEEP | — | — | |
| `qr-create` | **EXTEND** — **đã làm 03/10/2026** | Thêm loại vCard (3.0) | S | v2.0 §16 |
| `qr-read` | FIX — **đã làm 03/10/2026** | Trần 100 MB + 80 triệu điểm ảnh, xét từ header trước khi giải mã, báo lý do | S | G0: công cụ duy nhất không có trần |
| `random-code` | KEEP | Không ưu tiên (P3) | — | |
| `postal-code` | ~~Giữ "Sắp có"~~ **Đã gỡ thẻ 03/10/2026** (không có dataset) | Cần dataset có version; không có thì gỡ thẻ | ? | v1.0 §3 (P3) |
| `quick-note` | KEEP | — | — | |

Việc FIX chung, không thuộc riêng công cụ nào:

| Việc | Cỡ | Căn cứ |
| --- | --- | --- |
| Nút chép kết quả OCR dùng hàm chép chung có đường lùi (`FlowResult.tsx` đang gọi thẳng clipboard) | S | G0 |
| Sửa hai comment "không gọi API" cho khớp thực tế (có bộ đếm lượt mở) — **đã làm 03/10/2026** | S | G0 |
| Thêm trần số tệp mỗi lô và trần .zip | S | v2.0 §10 — hiện không có |
| Mã lỗi chuẩn thay cho chuỗi tự do (11 mã của v2.0 §9) — **đã làm 03/10/2026** | M | v2.0 §9 |
| State machine của luồng ba bước theo v2.0 §9 | M — **cần BA chốt có bắt buộc đủ 7 trạng thái không**: luồng hiện tại (`idle / running / done`) đang chạy ổn | v2.0 §9 |

## 3. Công cụ P0 mới

| Công cụ | Quyết định | Dùng lại gì | Phải làm mới | Cỡ |
| --- | --- | --- | --- | --- |
| PDF → Ảnh | **MERGE** (đường vào mới, engine cũ) | `convert-file` đã xuất JPG / PNG theo DPI, có .zip | Slug + thẻ riêng trỏ vào cùng màn với tuỳ chọn ảnh chọn sẵn; thêm WebP nếu cần | S |
| Sắp xếp PDF | **EXTEND** | `page-ops`, `PageGrid`, `buildPdf` của trình chỉnh sửa | Màn gọn chỉ có lưới trang + xoay / xoá / kéo xếp | M |
| Đánh số trang | **EXTEND** | `pdf-decorate` (6 vị trí, mẫu `{n}/{N}`, số bắt đầu, phạm vi) | Màn riêng theo luồng ba bước | S–M |
| Đóng dấu PDF | **EXTEND** | Watermark chữ + 5 dấu chữ có sẵn | Dấu ảnh / logo (hiện không có); màn riêng | M |
| Che thông tin PDF | **EXTEND** | `pdf-redact` (vẽ lại trang 200 DPI, lớp chữ ẩn chỉ giữ phần ngoài khung) | Màn riêng để vẽ khung che; bộ test khôi phục tự động (copy / search / extract) | M |
| Che thông tin / đóng dấu ẢNH | **NEW** trong engine Image — **đã làm 03/10/2026** (`mark-image`) | `image-codec`, `CropBox` (kéo khung) | Vẽ đè lên điểm ảnh rồi mã hoá lại | M |
| Ảnh hàng loạt | **EXTEND** — **đã làm 03/10/2026** (`batch-image`; không có gỡ metadata vì quyết định giữ EXIF) | `convertImagesTask`, `compressImagesTask`, zip | Resize theo kích thước tự chọn, đổi tên theo mẫu, gỡ metadata | M |
| Ảnh thẻ & In ảnh | **NEW** — **đã làm 03/10/2026** (`id-photo`; CHƯA có đổi nền) | `image-codec`, `crop-rect` + `CropBox`, ý tưởng khổ giấy của `image-sheet` | Preset kích thước mm → px, đổi nền bằng hút màu + mặt nạ tay, tờ in (bản sao, lề, crop marks) | **L** |
| %, VAT, chiết khấu, margin, markup, chia tiền | **EXTEND** `quick-calc` | Khung `ToolBoard`, `parseDecimal`, cách in "phép tính đã hiểu" | Bảng preset có version; không viết cứng thuế suất | M |
| Ngày làm việc / chênh lệch ngày / thời hạn | **NEW** (Time engine) | Khung `ToolBoard` | Toàn bộ logic ngày; hồ sơ ngày nghỉ (thiếu thì chỉ loại T7 / CN và nói rõ) | M |
| QR vCard | **EXTEND** | `qr-payload` | Một loại nội dung nữa | S |

## 4. Thứ tự đề xuất

Bám sprint của v2.0 §23, xếp theo "sửa cái đang sai trước, mở cái mới sau":

1. **EXIF + trần `qr-read`** — **đã làm 03/10/2026**, theo hướng GIỮ EXIF (mục 5
   câu 2): nén / cắt / đo ra JPG mang EXIF sang, ghi chú kết quả nói đúng theo
   từng ảnh, `qr-read` có trần 100 MB / 80 triệu điểm ảnh. Bổ sung cùng ngày:
   nguồn PNG / WebP và ảnh trong PDF bị nén lại cũng giữ EXIF; bảng giới hạn
   chung + trần số tệp, tổng dung lượng, điểm ảnh trên điện thoại.
2. **Nền tảng** — Registry đủ trường + cờ từng công cụ, bảng giới hạn từ config,
   gộp tiện ích trùng (mục 1.2, sau khi chốt phương án A / B).
3. **PDF P0** — PDF → Ảnh, Sắp xếp, Đánh số trang, Đóng dấu, Che thông tin: toàn
   EXTEND trên engine đã có golden.
4. **Tính toán + ngày + QR vCard** — độc lập với PDF, làm song song được.
5. **Ảnh hàng loạt, che / đóng dấu ảnh, Ảnh thẻ** — Ảnh thẻ là việc lớn nhất và
   cần engine Print mới, để sau cùng.

## 5. Điểm cần CTO / BA quyết trước khi ký G3

| # | Câu hỏi | Ai | Ảnh hưởng |
| --- | --- | --- | --- |
| 1 | "0 AI / LLM / token" có chấp nhận tesseract LSTM chạy cục bộ không? | CTO | Không thì hai công cụ OCR phải RETIRE hoặc đổi engine |
| 2 | ~~Gỡ EXIF / GPS: gỡ luôn, hay cho chọn giữ?~~ **Đã chốt 03/10/2026 (chủ dự án): KHÔNG gỡ** — ngày chụp và vị trí là bằng chứng hiện trường. Lệch có chủ ý so với v2.0 §13 ("gỡ mặc định"); BA cần ghi nhận vào spec | BA ghi nhận | Mục 2 đã sửa theo |
| 3 | `quick-calc` (diện tích, thể tích, khối lượng thép): giữ ở Chuyện Nhỏ hay chuyển sang "Công cụ Xây dựng"? | BA | v1.0 §12 cấm trộn; quyết định chỗ ở của preset VAT / margin |
| 4 | Bộ nhóm: giữ bộ đang chạy (theo ảnh ngày 03/10/2026) hay về 9 category của v1.0 §9? | BA | Cập nhật spec hoặc cập nhật code |
| 5 | Số cho Limit Matrix (MB, trang, điểm ảnh, số tệp, .zip, timeout) | CTO | Đã có số ở registry mục 7.5 — chờ CTO chốt trần |
| 6 | State machine + mã lỗi của v2.0 §9: bắt buộc đủ, hay chỉ áp cho công cụ mới? | CTO + BA | Cỡ việc của phần nền tảng |
| 7 | Tiện ích dùng chung đặt ở `hub/` hay feature mới `tools/shared/`? | CTO (ADR ở G4) | Mục 1.2 |
| 8 | ~~`postal-code`: có dataset không, hay gỡ thẻ?~~ **Đã gỡ thẻ 03/10/2026** | BA | |
| 9 | Top 12 trang chủ + từ điển đồng nghĩa cho ô tìm: danh sách cụ thể | BA | Phần nền tảng |
| 10 | Analytics: 10 sự kiện của v1.0 §17 gửi về đâu? Hiện chỉ có bộ đếm lượt mở | CTO | Cần backend ngoài `erp_tools` |

## 6. Chưa có trong tài liệu này

- ~~Benchmark cho Limit Matrix~~ — có ở `doc-tools-registry.md` mục 7.5, gồm
  lượt giả CPU chậm 4× (03/10/2026). Còn thiếu: máy RAM thấp, điện thoại thật.
- ~~ADR (G4), rollback (G5), threat model, soát giấy phép~~ — **bản nháp** ở
  [doc-tools-governance.md](doc-tools-governance.md) (03/10/2026), chưa ai duyệt.
- Kiểm trên Safari / Android / iOS máy thật (v2.0 §21): chưa làm.
- Mọi thứ phía máy chủ (job API, quota, TTL): chưa công cụ nào trong danh sách
  P0 ở trên bắt buộc phải lên máy chủ.
