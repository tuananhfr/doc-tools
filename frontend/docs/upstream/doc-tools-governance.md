# Chuyện Nhỏ / DocTools — threat model, giấy phép, ADR, rollback (BẢN NHÁP)

> **Trạng thái: NHÁP ngày 03/10/2026 — chưa ai duyệt.** Tài liệu này gom bốn thứ
> spec v2.0 đòi ở các cổng G4 / G5 và mục §21 mà trước giờ chưa có trên giấy.
> Mọi dòng dưới đây mô tả **mã đang chạy** ở nhánh `tuananhfr`; chỗ nào chỉ là
> suy đoán hoặc chưa kiểm thì ghi rõ "chưa kiểm". Người duyệt: CTO (mục 1, 3, 4),
> CTO + pháp chế (mục 2).
>
> Đọc kèm: [doc-tools.md](doc-tools.md) (cách hệ thống chạy),
> [doc-tools-registry.md](doc-tools-registry.md) (bản đồ công cụ, số đo),
> [doc-tools-decisions.md](doc-tools-decisions.md) (quyết định theo spec).

## 1. Threat model

### 1.1. Hệ thống trong một đoạn

33 công cụ chạy **hoàn toàn trong trình duyệt**. Tệp người dùng chọn được đọc
vào RAM của tab, xử lý bằng JavaScript / WASM cùng origin, kết quả là một `Blob`
tải về. Không có máy chủ xử lý tệp, không có tệp tạm phía máy chủ, không có tài
khoản bắt buộc (nhánh công khai `/doc-tools`). Hai lệnh gọi mạng duy nhất của
phần này: `POST tools/visits` (chỉ gửi slug công cụ) và `GET tools/stats`.

### 1.2. Thứ cần bảo vệ

| Tài sản | Vì sao quan trọng |
| --- | --- |
| Nội dung tệp người dùng (hợp đồng, CCCD, ảnh hiện trường có GPS) | Lời hứa của sản phẩm là "tệp không rời máy bạn" |
| Phần đã che / đã xoá | Người dùng tin là thông tin không còn trong tệp gửi đi |
| Phiên ERPcons của người đã đăng nhập (nhánh `/tools`) | Cùng origin với app chính: lỗ hổng ở công cụ là lỗ hổng của cả ERP |
| Ghi chú nhanh, danh sách "dùng gần đây" | Nằm trong `localStorage` của thiết bị |
| Tính đúng của kết quả (tiền, ngày, mã QR, so sánh) | Người dùng ra quyết định theo con số |

### 1.3. Ranh giới tin cậy

1. **Tệp đầu vào → bộ phân tích** (pdf.js, pdf-lib, PDFium, qpdf, bộ giải mã ảnh
   của trình duyệt, tesseract, ZXing). Tệp là dữ liệu KHÔNG tin được.
2. **Tab → mạng.** Mặc định không gì đi qua; phải giữ được như vậy.
3. **Tab → thiết bị** (`localStorage`, bộ nhớ tạm, camera, tệp tải về, service
   worker cache).
4. **Chuỗi cung ứng**: gói npm + tệp WASM + dữ liệu OCR + phông chữ được phát
   hành cùng app.

### 1.4. Mối đe doạ và hiện trạng

| # | Mối đe doạ | Đã có gì | Còn hở |
| --- | --- | --- | --- |
| T1 | Tệp PDF / ảnh độc hại làm treo tab hoặc ăn hết RAM (zip bomb, ảnh khai khổ khổng lồ, 10.000 trang) | Một bảng trần ở `hub/config/limits.ts`: 100 MB / tệp, 500 trang, 100 tệp / lô, 300 MB giữ trong RAM, 50 / 80 triệu điểm ảnh; đọc kích thước ảnh từ header TRƯỚC khi giải mã; nhận tệp theo chữ ký byte chứ không theo đuôi; `check-limits` | Không có timeout cứng cho một lượt chạy (chỉ có nút Huỷ). PDF có luồng nén phình to ("PDF bomb") chưa có bài thử riêng. So sánh tài liệu có trần 1500 dòng khác nhau |
| T2 | Tệp độc hại chạy mã trong origin của ERP (XSS qua tên tệp, chữ trong PDF, nội dung mã QR, JavaScript nhúng trong PDF) | React escape mọi chữ; `features/tools` không có `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` (grep ngày 03/10/2026); lõi pdf.js không chạy JavaScript nhúng trong PDF (app không nạp sandbox scripting của nó); mã QR chỉ hiện dạng chữ, link phải bấm mới mở | Chưa có CSP riêng cho nhánh `/doc-tools` (CSP nếu có là của nginx — ngoài repo, chưa kiểm). Lỗ hổng trong pdf.js / PDFium là lỗ hổng của ta: cần quy trình cập nhật (xem T8) |
| T3 | Nội dung tệp rò ra mạng (thư viện gọi về nhà, analytics, lỗi gửi kèm dữ liệu) | `check-network` chạy từng công cụ với tệp mang chuỗi đánh dấu và soi mọi request: không lệnh ghi lạ, không origin ngoài, không chuỗi đánh dấu trong URL / body. Tesseract tắt cache và nạp lõi + dữ liệu từ chính origin | Chạy tay, **không nằm trong CI** — một bản cập nhật thư viện có thể lặng lẽ thêm lệnh gọi. Đo trên bản dev; bản production chỉ được soi ở lượt G0 |
| T4 | "Che" nhưng không xoá: người nhận gỡ lớp phủ, chép chữ, hoặc đọc ảnh xem trước nhúng trong EXIF | Che thông tin PDF dựng lại cả trang thành ảnh và chỉ giữ lớp chữ NGOÀI khung; bài thử khôi phục trong `check-page-tools` (chữ, luồng nội dung gốc, số ảnh trên trang). Che ảnh ghi khối đen vào điểm ảnh và xoá ảnh xem trước nhúng (`exifForRedraw`). "Che chữ" của trình chỉnh sửa được ghi rõ là CHỈ trên bề mặt | Bài thử khôi phục chạy tay, chưa là cổng tự động. Metadata của PDF (XMP, tệp đính kèm, lịch sử sửa đổi dạng incremental save) ở các trang KHÔNG che chưa có bài thử. Tệp ra của "Che chữ" (bề mặt) vẫn chứa chữ gốc — đúng thiết kế nhưng dễ dùng nhầm |
| T5 | Ảnh mang GPS / ngày chụp bị gửi đi mà người dùng không biết | **Quyết định của chủ dự án 03/10/2026: GIỮ EXIF** (bằng chứng hiện trường). Màn kết quả nói rõ tệp ra còn hay mất thông tin máy ảnh | Lệch có chủ ý so với v2.0 §13 ("gỡ mặc định"). Không có nút "gỡ metadata" cho người muốn gỡ — rủi ro riêng tư được CHẤP NHẬN, cần BA ghi vào spec |
| T6 | "Chèn chữ ký" bị hiểu là chữ ký số; hình chữ ký bị người khác lấy dùng lại | Tên đổi thành "Chèn chữ ký"; màn tuỳ chọn và màn kết quả đều ghi "không phải chữ ký số". Nét ký và ảnh chữ ký chỉ nằm trong RAM, không lưu lại | Hình chữ ký trong tệp ra là một ảnh PNG tách ra được như mọi ảnh trong PDF — bản chất của việc dán hình, không chặn được; đã nói trong tài liệu |
| T7 | Người khác dùng chung máy đọc được dữ liệu để lại | Tệp và kết quả không lưu. Chỉ có: 5 slug gần đây, kiểu xem, và **toàn bộ Ghi chú nhanh ở dạng JSON thường** trong `localStorage` | Ghi chú nhanh không mã hoá, không có nút "xoá hết khi rời máy". Tệp tải về nằm trong thư mục Downloads — ngoài tầm của app |
| T8 | Chuỗi cung ứng: gói npm hoặc tệp WASM bị cài mã độc | `package-lock.json` khoá phiên bản; CI dùng `npm ci`; WASM và dữ liệu OCR phát hành từ chính origin, không tải từ CDN | Không có `npm audit` / quét phụ thuộc trong CI. Không có SRI cho tệp WASM. Nguồn gốc `vie.traineddata.gz` không ghi trong repo (xem mục 2). Chưa có lịch cập nhật pdf.js |
| T9 | Lạm dụng bộ đếm `tools/visits` (route công khai, không CSRF) để bơm số hoặc gây tải | Chỉ nhận slug; phía Drupal có flood 120 lượt / giờ / IP *(theo tài liệu, ngoài repo — chưa kiểm lại)* | Số liệu "lượt dùng" trên trang chọn là số có thể bị bơm; không dùng cho quyết định nào ngoài hiển thị |
| T10 | Service worker phát bản cũ có lỗi bảo mật sau khi đã vá | SW cập nhật theo bản build; chunk cũ bị dọn sau 14 ngày | Người mở app liên tục không tải lại vẫn chạy mã cũ tới khi tải lại — chưa có cơ chế ép cập nhật khi vá bảo mật |
| T11 | Kết quả sai mà trông đúng (thuế suất mặc định lỗi thời, ngày lễ, so sánh bỏ sót) | Thuế suất KHÔNG có mặc định; bộ tính ngày ghi rõ chỉ loại T7 / CN; So sánh báo LỖI khi tệp không có lớp chữ thay vì báo "giống nhau" và ghi rõ không so hình / định dạng; mỗi preset tiền có mã + phiên bản công thức | So sánh ở mức dòng: đổi chỗ ngắt dòng hiện là khác (báo thừa, không báo thiếu). OCR sai chữ là giới hạn của engine, chỉ được cảnh báo chung |

### 1.5. Ngoài phạm vi của bản nháp này

Bảo mật phía Drupal và nginx (CSP, header, flood) — ngoài repo. Thiết bị đã bị
chiếm quyền. Trình duyệt ngoài Chrome / Edge: Safari, Android, iOS **chưa được
kiểm trên máy thật**.

### 1.6. Việc đề xuất (chưa làm, chờ duyệt)

1. Đưa `check-network` và bài thử khôi phục của Che thông tin vào CI (cần
   Playwright + Chrome trên runner).
2. `npm audit --omit=dev` trong CI, ngưỡng `high`.
3. CSP cho app: tối thiểu `connect-src 'self'` — biến lời hứa "không gửi tệp đi"
   thành thứ trình duyệt cưỡng chế. Cần thử vì WASM đòi `'wasm-unsafe-eval'`.
4. Nút "Xoá dữ liệu trên máy này" ở trang chọn công cụ (ghi chú, gần đây).
5. Bài thử metadata PDF sau khi che (XMP, đính kèm, incremental save).

## 2. Soát giấy phép thư viện

Cách soát (03/10/2026): đi theo cây phụ thuộc `dependencies` +
`optionalDependencies` từ 13 gói mà `features/tools` import, đọc trường
`license` trong `package.json` của từng gói đã cài. **151 gói.** Đây là soát
theo trường khai báo, **chưa đối chiếu văn bản giấy phép trong từng gói** và
chưa có ý kiến pháp chế.

### 2.1. Gói import trực tiếp

| Gói | Phiên bản cài | Giấy phép khai | Dùng cho |
| --- | --- | --- | --- |
| `pdf-lib` | 1.17.1 | MIT | dựng / ghi PDF |
| `@pdf-lib/fontkit` | 1.1.1 | MIT | nhúng phông |
| `pdfjs-dist` | 6.2.108 | Apache-2.0 | vẽ trang, đọc lớp chữ |
| `@embedpdf/pdfium` | 2.15.1 | MIT (gói) + giấy phép PDFium kèm `LICENSE.pdfium` | vẽ trang chính xác, nén |
| `@neslinesli93/qpdf-wasm` | 0.3.0 | ISC (gói bọc) | mở PDF có mật khẩu |
| `tesseract.js` / `tesseract.js-core` | 7.0.0 | Apache-2.0 | OCR |
| `docx` | 9.8.1 | MIT | PDF → Word |
| `exceljs` | 4.4.0 | MIT | PDF → Excel |
| `fflate` | 0.8.3 | MIT | ghi .zip |
| `qrcode` | 1.5.4 | MIT | tạo mã QR |
| `@zxing/browser` / `@zxing/library` | 0.2.1 / 0.23.0 | MIT / Apache-2.0 | đọc mã QR, mã vạch |

### 2.2. Cả cây 151 gói, theo giấy phép

| Giấy phép | Số gói | Ghi chú |
| --- | --- | --- |
| MIT | 109 | |
| ISC | 22 | |
| Apache-2.0 | 8 | phải giữ thông báo bản quyền + NOTICE nếu gói có |
| BSD-3-Clause / BSD-2-Clause / 0BSD | 4 | |
| MIT/X11 | 2 | `chainsaw`, `traverse` (qua `exceljs`) |
| MIT AND Zlib | 1 | `pako` |
| BlueOak-1.0.0 | 1 | `sax` — giấy phép cho phép rộng, ít gặp: cần pháp chế xác nhận |
| Unlicense | 1 | `big-integer` |
| Unlicense OR Apache-2.0 | 1 | `@zxing/text-encoding` |
| **MIT OR GPL-3.0-or-later** | 1 | `jszip` (qua `exceljs`) — giấy phép KÉP, ta dùng theo nhánh **MIT** |
| **Không khai** | 1 | `buffers@0.1.1` (qua `exceljs` → `unzipper` → `binary`) — phải mở gói ra đọc |

Không gói nào chỉ có giấy phép copyleft (GPL / AGPL / LGPL).

### 2.3. Thứ không phải gói npm nhưng được phát hành cùng app

| Thứ | Ở đâu | Giấy phép | Trạng thái |
| --- | --- | --- | --- |
| Phông Be Vietnam Pro, Arimo, Tinos, Noto Serif (nhúng vào PDF ra) | `src/assets/fonts/` | SIL OFL 1.1 — tệp `OFL*.txt` nằm cạnh | Có văn bản giấy phép trong repo. OFL cho phép nhúng vào tài liệu |
| `vie.traineddata.gz` (dữ liệu OCR tiếng Việt, 1,4 MB) | `public/vendor/tesseract/` | Bộ tessdata của dự án Tesseract là Apache-2.0 | **Chưa kiểm**: repo không ghi tệp này lấy từ đâu, bản nào (`tessdata_fast` / `tessdata_best`). Cần ghi nguồn + mã băm |
| Tệp nhị phân PDFium (`.wasm`) | trong `@embedpdf/pdfium` | BSD-3-Clause / Apache-2.0 (PDFium) + giấy phép của các thư viện PDFium gộp vào (FreeType, libjpeg-turbo, OpenJPEG, zlib…) | Có `LICENSE.pdfium` trong gói — **chưa đọc hết** danh sách thành phần |
| Tệp nhị phân qpdf (`.wasm`) | trong `@neslinesli93/qpdf-wasm` | qpdf là Apache-2.0 | **Gói không kèm tệp LICENSE của qpdf** — cần bổ sung thông báo bản quyền khi phát hành |

### 2.4. Việc còn thiếu trước khi coi là "đã soát"

1. Trang / tệp "Giấy phép bên thứ ba" phát hành cùng app (Apache-2.0, BSD, OFL
   đều đòi giữ thông báo bản quyền). Hiện **không có**.
2. Mở gói `buffers@0.1.1` và `sax` đọc văn bản giấy phép.
3. Ghi nguồn + mã băm của `vie.traineddata.gz`.
4. Đọc `LICENSE.pdfium`, liệt kê thành phần gộp.
5. Ý kiến pháp chế cho việc dùng nhánh MIT của `jszip`.
6. Bước tự động trong CI chặn gói mới mang giấy phép ngoài danh sách cho phép.

## 3. ADR (G4)

Mỗi mục là một quyết định **đã nằm trong mã**; ghi lại để người sau không phải
đoán và để CTO duyệt hoặc bác.

### ADR-01 — Xử lý 100% trong trình duyệt, không có job phía máy chủ

- **Bối cảnh.** v2.0 mô tả cả hai chế độ (LOCAL_ONLY và job máy chủ có TTL).
  Mọi công cụ P0 đều làm được trong trình duyệt.
- **Quyết định.** Cả 33 công cụ là `LOCAL_ONLY`. Không có API nhận tệp.
- **Hệ quả.** Không phải lo lưu trữ, TTL, quota, quét virus phía máy chủ; lời
  hứa riêng tư kiểm được bằng `check-network`. Đổi lại: trần phụ thuộc RAM của
  thiết bị (xem benchmark), không làm được việc cần máy chủ (chữ ký số, OCR
  nhiều ngôn ngữ nặng, chuyển Word → PDF trung thực).
- **Điều kiện xét lại.** Có công cụ P0 không thể chạy cục bộ.

### ADR-02 — Bốn feature, một khung luồng

- **Quyết định.** `tools/hub` (danh mục, khung ba bước `ToolFlow`, trần, mã
  lỗi) · `tools/shared` (tiện ích thuần dùng chung: zip, tên tệp, header ảnh,
  EXIF, canvas → tệp) · `tools/pdf` · `tools/image` · `tools/qr` ·
  `tools/utility`. Feature công cụ chỉ import `hub` và `shared` qua `index.ts`;
  `hub` và `shared` không import feature nào.
- **Vì sao tách `shared` khỏi `hub`.** `hub` nằm trên đường khởi động của trang
  chọn công cụ; tiện ích xử lý tệp không được kéo vào đó. Trần và mã lỗi ở lại
  `hub` vì chính khung luồng dùng.
- **Hệ quả.** Có hai lớp vẽ khung che gần giống nhau (`pdf/RedactOverlay`,
  `image/MarkOverlay`) — chấp nhận trùng thay vì cho feature import nhau.

### ADR-03 — Engine PDF: pdf-lib ghi, pdf.js đọc, PDFium vẽ chính xác

- **Quyết định.** Một đường dựng tệp duy nhất (`doc-build` → `pdf-assemble`)
  cho cả trình chỉnh sửa lẫn mọi công cụ nhanh; công cụ nhanh chỉ là một hàm
  trả `FlowTask`. pdf.js không được nằm trên đường khởi động (build fail nếu vi
  phạm — `startupGuard`).
- **Hệ quả.** Sửa một lỗi dựng tệp là sửa cho mọi công cụ; golden baseline
  (`golden.mjs`, 35 mục) là lưới an toàn khi đụng engine.

### ADR-04 — Trang trí lúc xuất dùng chung hàm bố cục với bản xem trước

- **Quyết định.** Số trang, dấu chữ, dấu ảnh, chữ ký đều tính vị trí bằng các
  hàm thuần trong `pdf/utils/decorations.ts` theo trang NHÌN THẤY (đã áp
  `/Rotate`, CropBox); lớp phủ trên màn hình và `pdf-decorate` gọi cùng hàm.
- **Mở rộng 03/10/2026.** `ImageStamp.spots` (tâm theo tỉ lệ trang) cho đặt tự
  do; có `spots` thì `anchor` / `scope` không được đọc.
- **Hệ quả.** "Thấy gì ra nấy" là thuộc tính của cấu trúc, không phải của việc
  kiểm tay.

### ADR-05 — Che thông tin PDF = dựng lại trang thành ảnh

- **Quyết định.** Trang có khung che được vẽ ra ảnh 200 DPI rồi dựng lại; lớp
  chữ ẩn chỉ giữ mảnh ngoài khung.
- **Vì sao không sửa luồng nội dung.** Gỡ đúng toán tử chữ / hình dưới một
  khung trong mọi loại PDF là bài toán của một thư viện redaction chuyên dụng;
  làm sai một trường hợp là rò thông tin. Dựng lại thành ảnh sai theo hướng an
  toàn.
- **Hệ quả.** Trang đã che mất liên kết, ô nhập liệu, chữ vector; tệp nặng hơn.

### ADR-06 — Giữ EXIF của ảnh

- **Quyết định (chủ dự án, 03/10/2026).** Không gỡ EXIF / GPS; khi vẽ lại ảnh
  thì chép EXIF sang, sửa cờ xoay về 1 và xoá ảnh xem trước nhúng.
- **Lệch spec.** v2.0 §13 đòi gỡ mặc định. BA cần ghi nhận.

### ADR-07 — So sánh tài liệu là so dòng chữ, xác định

- **Quyết định.** Myers diff trên các dòng của lớp chữ; không AI, không so hình.
  Vượt 1500 dòng khác nhau thì báo "bỏ hết rồi thêm hết" kèm cảnh báo.
- **Hệ quả.** Kết quả lặp lại được và giải thích được; đổi lại không hiểu "cùng
  nghĩa khác chữ" và nhạy với chỗ ngắt dòng.

### ADR-08 — Tắt từng công cụ bằng biến môi trường lúc build

- **Quyết định.** `VITE_TOOLS_OFF=<id>,<id>` gỡ cả thẻ lẫn đường vào của công
  cụ; `VITE_DOC_TOOLS=0` tắt cả phần này.
- **Hệ quả.** Tắt một công cụ = build + deploy lại (vài phút), không có công tắc
  nóng phía máy chủ. Xem mục 4.

## 4. Kế hoạch rollback (G5)

### 4.1. Thứ có thể phải lùi

Phần này **không có dữ liệu phía máy chủ và không có migration**: rollback luôn
là lùi mã, không bao giờ là lùi dữ liệu.

| Tình huống | Cách lùi | Thời gian ước lượng | Ghi chú |
| --- | --- | --- | --- |
| Một công cụ ra kết quả sai / làm treo máy | Thêm id vào `VITE_TOOLS_OFF` trong `.env.production`, merge vào `main` → pipeline build + deploy | một lượt pipeline | Thẻ và đường vào biến mất; link đã phát ra về trang chọn công cụ |
| Cả phần Chuyện Nhỏ có sự cố | `VITE_DOC_TOOLS=0` rồi deploy | một lượt pipeline | Phần còn lại của ERP không đổi |
| Bản deploy mới hỏng toàn app | Trên máy chủ: đổi `dist_backup` về `dist` (pipeline tự sao `dist` → `dist_backup` trước mỗi lần đẩy) | vài phút, làm tay qua ssh | **Chỉ giữ MỘT bản backup** — deploy hai lần liên tiếp là mất bản tốt trước đó |
| Một commit cụ thể gây lỗi | `git revert <commit>` trên `main` → pipeline | một lượt pipeline | Mỗi đợt việc là một commit riêng (`feat(tools): …`), revert được độc lập — trừ commit đụng engine dùng chung (`decorations`, `pdf-assemble`, `tools/shared`) |

### 4.2. Thứ rollback KHÔNG tự xử lý

- **Service worker.** Người đang mở app vẫn chạy bản cũ (kể cả bản lỗi) tới khi
  SW mới kích hoạt và trang tải lại. Lùi mã không kéo được họ về ngay.
- **Chunk theo tên băm.** Deploy không xoá `assets/` cũ trong 14 ngày nên bản
  lùi và bản lỗi cùng tồn tại — đúng ý, để người đang mở không gặp 404.
- **`localStorage`.** Khoá `erpcons.tools.*` (gần đây, kiểu xem, ghi chú) không
  có phiên bản lược đồ. Bản lùi phải đọc được dữ liệu bản mới ghi; hiện đúng vì
  chưa đợt nào đổi hình dạng các khoá này. Đổi hình dạng trong tương lai phải
  kèm đường đọc ngược.
- **Golden baseline.** `scripts/doc-tools/golden/baseline.json` đi theo mã:
  revert commit nào thì baseline lùi theo commit đó.

### 4.3. Tín hiệu để quyết định lùi

Chưa có giám sát lỗi phía người dùng cho phần này (không có Sentry / log lỗi
client gửi về) — sự cố hiện chỉ biết qua phản ánh của người dùng. Đây là lỗ
hổng lớn nhất của kế hoạch rollback: **có đường lùi nhưng không có chuông báo**.

### 4.4. Diễn tập

- **Tắt công cụ bằng cờ — đã diễn tập 03/10/2026** trên máy dev: build
  production với `VITE_TOOLS_OFF=sign,compare`, phục vụ bằng `vite preview`, so
  với bản không có cờ. Kết quả: hai thẻ biến mất khỏi kết quả tìm,
  `/doc-tools/ky-tai-lieu` và `/doc-tools/so-sanh-tai-lieu` về trang chọn,
  `/doc-tools/ghep-pdf` vẫn mở. Chưa diễn tập qua pipeline thật.
- **Đổi `dist_backup` trên máy chủ — CHƯA diễn tập** (cần quyền ssh vào máy
  chủ, ngoài phạm vi phiên làm việc này).
- **`git revert` một commit công cụ — chưa diễn tập.**
