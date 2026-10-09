# Chuyện nhỏ — công cụ PDF, DocTools bản Free

Công cụ sắp xếp trang PDF / ảnh **chạy hoàn toàn trong trình duyệt**: không gọi
API, không lưu gì lên máy chủ, tệp chỉ sống trong RAM của tab. Bản công khai
(`/doc-tools`) nằm **ngoài mọi guard** (spec DocTools 10: tác vụ nhanh không bắt
đăng nhập); cùng bộ trang đó còn một nhánh trong khung app (`/tools`).
Bản Pro (lưu trữ, phiên bản, chia sẻ, AI) chưa làm — sẽ dựng trên CDE
(`erp_document`), không phải trên module này.

Feature: `src/features/tools/pdf/` (engine PDF + trình chỉnh sửa; trước 03/10/2026 nằm ở
`features/documents/doc-tools/` — tài liệu này vẫn gọi nó là "doc-tools") ·
Spec gốc: bộ 24 tài liệu "ERPCons DocTools" (FINAL 30/09/2026), chủ yếu 01
(Free), 08 (backlog), 09 (test matrix) — trên máy dev ở
`C:\Users\admin\Downloads\ERPCons DocTools\` (không nằm trong repo).

## "Chuyện Nhỏ" — trang chọn công cụ và khung quanh nó

Từ 02/10/2026 trình chỉnh sửa PDF là MỘT trong các công cụ của bộ "Chuyện Nhỏ"
(`src/features/tools/hub/`). Mẫu giao diện: ba ảnh ở `Downloads/Chuyen nho` —
giữ bố cục của mẫu, màu và chữ theo Crimson Ice.

| Thứ | Ở đâu |
| --- | --- |
| Danh mục 33 công cụ (tên, slug, nhóm, `ready` / `soon`, `priority`, `synonyms`, `processing`) | `hub/config/tool-list.ts` (dữ liệu thô, chỉ `import type` — plugin `shareMeta` của Vite nạp nó lúc build để sinh thẻ chia sẻ) · `hub/config/tool-catalog.ts` (áp `VITE_TOOLS_OFF`, nhóm, tông) · `hub/utils/tool-registry.ts` |
| Trang chọn công cụ (`<gốc nhánh>`) | `hub/pages/ToolsHubPage.tsx` |
| Một công cụ (`<gốc nhánh>/<slug>`): dải đường dẫn + màn của công cụ | `hub/pages/ToolRoutePage.tsx` |
| Khung khách của nhánh công khai (không sidebar, không dải đầu trang) | `layouts/ToolsLayout.tsx` |
| Nút "Đăng nhập" / "Mở trong ERPcons" của nhánh công khai | `hub/hooks/useGuestSessionAction.ts` · `hub/components/GuestSessionAction.tsx` |
| Hai nhánh route + nối slug với màn thật | `routes/tools.routes.tsx` |
| Nhánh đang đứng (`kind`, `base`) cho mọi link nội bộ | `hub/hooks/tools-branch.ts` · `hub/components/ToolsBranchOutlet.tsx` |
| Khung luồng ba bước (chọn tệp → chạy → kết quả), không biết gì về PDF | `hub/components/flow/` · `hub/hooks/useFlowRun.ts` · `hub/types/flow.types.ts` |
| Mười một mã lỗi (spec v2.0 §9) + `ToolError` | `hub/utils/tool-error.ts` |
| Tiện ích XỬ LÝ TỆP dùng chung: zip, khử tên trùng, header ảnh, EXIF, mã hoá canvas | `src/features/tools/shared/` |
| Thứ hai feature công cụ cùng dùng: ô chọn một trong vài phương án, lời mời đăng nhập sau khi tải | `hub/components/flow/FlowChoice.tsx` · `hub/components/LoginNudge.tsx` · `hub/hooks/useDownloadNudge.tsx` |
| Khung của công cụ **không cần tệp** (nhập bên trái, kết quả sống bên phải) + nút chép | `hub/components/board/{ToolBoard,ToolPanel,ToolSegments}.tsx` · `hub/components/CopyButton.tsx` · `hub/utils/clipboard.ts` |
| Đọc / in con số người dùng gõ tay; câu báo lỗi camera | `hub/utils/number-input.ts` · `hub/utils/camera-error.ts` |
| Công cụ ảnh + cửa sổ camera (feature riêng, xem [Công cụ ảnh](#công-cụ-ảnh)) | `src/features/tools/image/` |
| Mã QR và sáu tiện ích nhỏ (hai feature riêng, xem [Tiện ích không cần tệp](#tiện-ích-không-cần-tệp)) | `src/features/tools/qr/` · `src/features/tools/utility/` |
| CSS | `styles/features/tools-hub.css` (trang chọn, khung khách) · `tools-flow.css` (luồng ba bước) · `tools-image.css` (vùng cắt / đo ảnh, camera) · `tools-utility.css` (khung không cần tệp, QR, tiện ích) · `doc-tools.css` (trình chỉnh sửa, và `.erp-doc-nudge*` của lời mời đăng nhập) |

- **`shared/` ≠ `hub/`.** `hub/index.ts` được tầng route import tĩnh nên nằm
  trên đường khởi động của app; thứ gì kéo thư viện (fflate) hoặc chỉ có nghĩa
  khi đang xử lý tệp thì nằm ở `tools/shared/`, nạp cùng chunk của từng công cụ.
  `shared/` không import feature nào (kể cả hub); `pdf/`, `image/`, `qr/` import
  nó qua `@/features/tools/shared`. Trần (`hub/config/limits.ts`) và mã lỗi ở lại
  hub vì chính khung luồng dùng.
- **Cờ từng công cụ**: `VITE_TOOLS_OFF=ocr,qr-read` (đọc ở `app.config.ts` →
  `toolsOff`) bỏ công cụ khỏi `TOOL_CATALOG` theo `id` — mất cả thẻ lẫn đường
  vào, slug của nó về trang chọn như slug lạ. Dùng để gỡ một công cụ đang lỗi
  khỏi production mà không sửa code.
- **Top 12 + từ đồng nghĩa**: chưa lọc, chưa tìm thì lưới chỉ bày 12 công cụ có
  `priority` (nhỏ đứng trước), dưới lưới là nút "Xem tất cả N công cụ". Chọn nhóm
  hoặc gõ tìm là xét trên TOÀN BỘ danh mục. Ô tìm khớp cả `synonyms` — chỉ ghi
  vào đó việc công cụ LÀM ĐƯỢC hôm nay, không ghi thứ sắp làm.
- **Mã lỗi**: mọi lời từ chối tệp (`FlowRejected.code`) và mọi lượt chạy hỏng
  (`FlowState.error = { code, message }`) mang một trong 11 mã. Câu tiếng Việt
  vẫn do công cụ viết; mã là thứ ổn định cho hỗ trợ và kiểm thử (`data-code`
  trên dòng từ chối và trên `.erp-flow-error`, lượt chạy hỏng in thêm "Mã lỗi:
  …"). Service ném `ToolError(code, câu)`; lỗi không có mã thành
  `UNKNOWN_ERROR`. `describeError` tìm mã dọc chuỗi `cause` vì service hay bọc
  lỗi để thêm tên tệp. Chưa dùng tới: `PROCESSING_TIMEOUT` (luồng chưa có hạn
  thời gian) — mã có sẵn, chỗ phát thì chưa.
- **Hub không import feature nào khác.** Danh mục chỉ ghi tên màn
  (`screen: 'editor'`, `'merge-pdf'`…); tầng route nối tên đó với component thật
  qua `TOOL_SCREENS` rồi truyền vào `ToolRoutePage`. Thêm một loại màn mới = thêm
  một giá trị vào `ToolScreen` + một dòng ở `TOOL_SCREENS`. `TOOL_SCREENS` phải
  khai **ngoài** component: object mới mỗi lần render là màn bị dựng lại, mất tệp.
- Công cụ `soon` hiện thẻ "Sắp có", **không phải link**; gõ thẳng slug của nó
  thì về trang chọn. Làm xong công cụ nào thì đổi `status` + thêm `screen`.
- "Dùng gần đây" là của **thiết bị** (`localStorage`: `erpcons.tools.recent`) —
  không gọi API, khách cũng có. Trang chọn chỉ có MỘT kiểu xem là lưới thẻ (kiểu
  "Danh sách" đã bỏ 03/10/2026).
- **Nhóm chia theo VIỆC, không theo loại tệp** (từ 03/10/2026): Tài liệu (gồm
  cả PDF) · Hình ảnh · Tính toán · Tiền · Ngày & thời hạn · Dữ liệu · Nhà & đời
  sống · Kỹ thuật · Tiện ích khác. Chip lọc chỉ hiện cho nhóm **đã có công cụ**
  (`TOOL_FILTERS` tự lọc từ danh mục) — hôm nay Tiền, Ngày & thời hạn, Nhà & đời
  sống, Kỹ thuật chưa có nên chưa có chip; gắn công cụ đầu tiên vào là chip tự
  hiện. Nhóm ĐẦU của công cụ quyết màu ô icon; chín nhóm, sáu tông:
  `money` chung tông với `calc`, `tech` với `other`, `date` với `document`
  (`info`). Không có tông `brand` (đã gỡ khỏi `ToolTone` lẫn CSS) — Tài liệu
  chiếm nửa lưới, crimson chỉ dành cho identity / CTA.
- **Hàng lọc luôn MỘT dòng**: ô tìm · kiểu xem · dãy nhóm, và dãy nhóm **trượt ngang**
  (dải mờ ở mép phải báo còn nhóm khuất; nhóm vừa bấm tự trượt vào giữa). Cho nhóm
  xuống dòng thì hàng lọc cao gấp đôi. Riêng ≤576px là hai dòng: ô tìm + kiểu xem
  đã chiếm gần hết bề ngang.
- **Cột phải rơi xuống dưới lưới thẻ (≤1280px, và luôn luôn ở khung khách chia
  đôi) thì MỖI HÀNG PHẢI KÍN bề ngang**: "Dùng gần đây" thành dải thẻ ngang, thẻ
  Pro nằm ngang (cả hai mang `erp-tools-panel--wide`), "Về Chuyện Nhỏ" + "Mẹo
  nhanh" chia đôi. Lưới `auto-fit` cũ để lẻ một khối (4 khối / 3 cột) và danh sách
  "gần đây" 5 dòng kéo cả hàng cao lên, hai khối kia rỗng ruột. Thêm khối mới
  vào `HubAside` thì phải giữ số khối nửa-hàng là số chẵn.
- **Hàng số liệu ở đáy hero chỉ hiện số THẬT** (`hub/hooks/useHubStats.ts`): số
  công cụ `ready` đếm từ danh mục · tổng **lượt mở công cụ** · ô cuối là lời mời **ERPCons Pro** cho khách (chữ + nút
  đỏ "Đăng ký dùng thử", cùng `ProContactButton` với thẻ Pro), người đã đăng nhập
  thấy số nhóm công cụ. Không có "số người dùng": không đếm người. Chữ "miễn phí" trong hero chỉ xuất hiện MỘT lần (khẩu hiệu) — đừng
  lặp lại ở danh sách tick hay hàng số liệu.
- **Bộ đếm lượt mở** — module Drupal `erp_tools` (`web/modules/custom/erp_tools`,
  bảng `erp_tools_visit`, mỗi công cụ một dòng cộng dồn, không lưu IP / thiết bị):
  - `ToolRoutePage` → `useRecordToolVisit` → `POST /tools/visits {tool}` khi mở
    một công cụ, ở cả hai nhánh. Cùng tab mở lại cùng công cụ trong 10 phút
    (F5, quay lại) không cộng — mốc giờ ở `sessionStorage`, ghi TRƯỚC khi gửi nên
    StrictMode không gửi hai lần. Lỗi bỏ qua im lặng.
  - Service gọi thẳng `client` với `skipSessionExpired` + `skipOutbox`: thiếu cờ
    đầu thì một 401 lạc đá người đang làm tệp sang trang đăng nhập; thiếu cờ sau
    thì lượt đếm lúc mất mạng chui vào hộp thư đi offline.
  - Route công khai, **không CSRF** (khách không có token; lượt đếm không chạm dữ
    liệu của ai); chống bơm số bằng flood 120 lượt/giờ/IP — vượt vẫn trả `ok`
    mà không cộng. Slug chỉ kiểm theo mẫu `[a-z0-9-]`, Drupal không giữ danh
    sách công cụ. `no_cache` vì page cache của khách bỏ qua max-age.
  - Banner chỉ hiện số khi tổng ≥ `VISIT_DISPLAY_THRESHOLD` (1.000) — "37 lượt
    dùng" phản tác dụng hơn không có gì; dưới ngưỡng / API lỗi / offline thì ô đó
    là "Không giới hạn lượt dùng".
  - Vì có gửi lượt đếm, câu cam kết của công cụ không cần tệp là "không gửi
    **nội dung** đi" (không còn "không gửi dữ liệu đi").
  - Kiểm: `vendor/bin/drush php:script web/modules/custom/erp_tools/scripts/check-visits.php`.
- **Mời dùng ERPCons Pro** — chỉ khách thấy: thẻ đầu cột phải (`HubAside`) và lời
  mời sau lượt tải đầu (`LoginNudge`). Nội dung là giá trị của Pro theo spec 02
  (`hub/config/pro-offer.ts`), **không** khoá gì của Free (spec 00). Nút "Liên hệ
  tư vấn" (`ProContactButton`) đọc `PRO_CONTACT_URL`: còn `null` (form dùng thử
  chưa có) thì bấm chỉ báo "sắp có"; điền URL thì mở tab mới — tệp trong RAM của
  tab này không mất. Có URL rồi thì `check-suggestions.mjs` (`nudge.getByRole('link')`)
  sẽ gặp hai link — lọc theo tên.
- Tiêu đề tab, dòng "Xử lý trên máy bạn" và đường về trang chọn do
  `ToolRoutePage` lo; `DocToolsPage` chỉ còn phần ruột.
- **Trình chỉnh sửa không tự cuộn nữa** — khung quanh nó cuộn
  (`.erp-shell__content` hoặc `.erp-tools-guest`). Khối dính của nó dựa vào hai
  biến đặt ở `.erp-doc-tools`: `--erp-doc-viewport` (chiều cao vùng cuộn) và
  `--erp-doc-frame-pad` (padding của `.erp-shell__content`: Chrome neo `sticky`
  ở mép **nội dung** của khung cuộn, `top: 0` sẽ chừa một khe cao bằng padding).
- **Khung khách chia đôi như trang đăng nhập** (`.erp-tools-frame--split`, tỉ lệ
  5:7): cột trái là `AuthBrandPanel` của trang đăng nhập (ẩn từ ≤1024px), cột
  phải là `.erp-tools-guest` — vẫn là vùng cuộn như trước. Trình chỉnh sửa PDF
  (`toolNeedsFullWidth()`: màn `editor`) bỏ cột ảnh bìa để lấy trọn bề ngang.
  Khung app (`/tools`) không đổi.
  - Cột công cụ hẹp hơn màn hình mà điểm gãy của công cụ viết bằng `@media` (bề
    rộng **màn hình**). Nên cột đó là container tên `erp-tools`, và mỗi khối
    `@media (max-width)` lớn hơn 576px trong `tools-hub.css` / `tools-flow.css` /
    `tools-utility.css` có một **bản sao `@container erp-tools`** đặt ngay bên
    dưới. Sửa khối `@media` là phải sửa bản sao; thêm điểm gãy mới >576px cho
    công cụ thì thêm cả hai. Khung app không có container này nên bản sao không
    bao giờ khớp ở đó.
- Offline: `/tools` nằm trong `LOCAL_PATHS` của `offline/screen-access.ts`
  — luôn mở và mục menu không bị làm mờ, vì không cần mạng. Bản công khai nằm
  ngoài `AppLayout` nên không đi qua cổng offline.
- Mục menu `tools.chuyen-nho` ("Công cụ (Chuyện nhỏ)") trỏ vào `/tools`, không
  khai `roles`: mọi tài khoản thấy. Menu sinh thêm một route ComingSoon cùng
  đường dẫn trong `pendingRoutes`; nó bị route thật che vì đứng sau (giống
  `/ai-agent`).

## Route — hai nhánh, một URL một khung

Cùng một bộ trang (`toolPages` ở `routes/tools.routes.tsx`) được gắn vào hai chỗ:

| | Nhánh công khai | Nhánh trong app |
| --- | --- | --- |
| Gốc | `/doc-tools` (`ROUTES.docTools`) | `/tools` (`ROUTES.tools`) |
| Vị trí trong bảng route | ngoài mọi guard | con của `AppLayout`, sau `RequireAuth` |
| Khung | luôn khung khách (`ToolsLayout`), vẽ ngay không chờ `/me` | luôn khung app |
| Chưa đăng nhập | dùng bình thường | về `/login` |
| Đã đăng nhập | vẫn khung khách; nút phiên thành "Mở trong ERPcons" (sang đúng công cụ đó ở `/tools`), không mời đăng nhập | dùng bình thường |

**Khung khách không có dải đầu trang** (từ 03/10/2026): tiêu đề lớn của hero
đã là "Chuyện Nhỏ", dải trên chỉ lặp lại. Nút phiên do chính trang vẽ —
góc phải trên của hero ở trang chọn (cùng hàng dòng "By ERPcons & LPC"), và ở
trang công cụ thì **thay chỗ** dòng "Xử lý trên máy bạn…" trên dải đường dẫn.
Lúc `idle` (đang hỏi `/me`) không có nút nên dòng cam kết vẫn hiện; nhánh trong
app không bao giờ có nút. Class `erp-tools-guest__login` là chỗ bám của
`check-tool-routes.mjs` — giữ nguyên.

**Hero của KHÁCH không có nút đăng nhập** (trang này để quảng bá): chỗ đó là hai
nút "Dùng thử ERPcons" (đỏ) + "Dùng thử TekshotOS" (xanh) —
`hub/components/HeroTrialActions.tsx`, link ở `PRO_CONTACT_URL` /
`TEKSHOT_TRIAL_URL` (`pro-offer.ts`, `null` = bấm báo "sắp có"). Người đã đăng
nhập thấy cả hai nút đó VÀ "Mở trong ERPcons" đứng sau (ba nút không vừa cột
danh sách cam kết nên hàng trên thành flex riêng — `erp-tools-hero__top--row`);
nhánh trong app `/tools` không có nút nào.

**Ngôn ngữ + giao diện ở khung khách** (`hub/components/GuestPrefs.tsx`): hai nút
nhỏ cạnh dòng "By ERPcons & LPC" trong hero, và trên dải đường dẫn ở trang công
cụ — chỉ nhánh công khai (nhánh trong app đã có ở header của `AppLayout`). Giao
diện dùng chung `useThemeMode()` với cả app. Ngôn ngữ mới có MỤC CHỌN như trang
đăng nhập, **chưa có bản dịch** — app chưa có i18n, chọn "English" không đổi gì. Nút "Đăng nhập" chỉ còn ở trang từng công cụ
và lời mời sau khi tải.

- **Vì sao không để chung một URL rồi chọn khung theo phiên** (cách cũ): khách
  phải chờ `/me` mới thấy trang, và khung app nằm ở nhánh route riêng nên bị
  **dựng lại** mỗi lần qua lại giữa công cụ và màn nghiệp vụ — bong bóng trợ lý
  đóng kết nối, sidebar mất trạng thái.
- **Mọi link nội bộ dựng từ `useToolsBranch().base`**, không viết cứng
  `ROUTES.docTools`: `toolPath(base, tool)`, `toolPathOf(base, id)`,
  `legacyToolPath(base, query)`. Viết cứng một gốc là người trong app bấm một
  thẻ rồi rơi ra khung khách.
- **Không tự chuyển người đã đăng nhập từ `/doc-tools` sang `/tools`**: `/me`
  trả về chậm là chuyển giữa chừng, tệp vừa thả mất theo. Chính nút "Mở trong
  ERPcons" cũng đổi nhánh → màn bị dựng lại, tệp đang làm mất.
- Lời mời đăng nhập vẫn xét theo **phiên** (`status === 'unauthenticated'`),
  không theo nhánh — nhờ vậy người đã đăng nhập mở link công khai không bị mời.
- Link gửi cho người ngoài phải là `/doc-tools/...`; link `/tools/...` đưa
  người chưa đăng nhập về trang đăng nhập.

Mọi slug đi qua cùng một `ToolRoutePage` và cùng vị trí của màn trong cây, nên
đổi giữa hai slug **chung một màn** (`chinh-sua-pdf` ↔ `xem-pdf`) **không
remount** — tệp đang làm còn nguyên. Hai công cụ nhanh là hai màn khác nhau:
sang công cụ khác là bắt đầu lại. Về trang chọn (hoặc bấm sang màn khác của
app) thì màn bị gỡ, **tệp trong RAM mất**.

**Rời trình chỉnh sửa đang giữ tệp thì phải hỏi** (`hub/components/ToolLeaveGuard.tsx`,
bật khi có ít nhất một trang). Hai lớp vì hai kiểu rời: điều hướng qua router
(link, sidebar, nút Back) bị `useBlocker` chặn và hỏi bằng hộp thoại của app;
đóng tab / F5 / gõ URL khác thì chỉ trình duyệt hỏi được (`beforeunload`).
Đổi giữa hai slug chung một màn **không hỏi** (`leavesToolScreen`), vì màn không
bị gỡ. Hết phiên ở nhánh trong app cũng không hỏi: `RequireAuth` gỡ trang ngay
sau đó, "Ở lại" chỉ còn màn trống. Hệ quả cho script kiểm: `page.goto()` /
`reload()` khi trình chỉnh sửa đang có tệp sẽ bật hộp `beforeunload` — script
phải có `page.on('dialog', d => d.accept())`, không thì đứng im tới hết giờ.
Cùng lớp hỏi đó gắn ở "Cắt & chỉnh ảnh" (khi đã cắt / xoay / chỉnh) và "Đo kích
thước ảnh" (khi đã đặt điểm hoặc đoạn chuẩn). Công cụ nhanh, Chuyển đổi ảnh và
Nén ảnh **không** gắn: tệp gốc vẫn nằm trên máy, làm lại chỉ là chọn tệp lần nữa.

Slug dưới đây đứng sau gốc của nhánh (`/doc-tools/<slug>` hoặc `/tools/<slug>`):

| Slug | Màn (`ToolScreen`) | Trang |
| --- | --- | --- |
| (không có) | — | trang chọn công cụ |
| `chinh-sua-pdf` · `xem-pdf` | `editor` | `pages/DocToolsPage` |
| `ghep-pdf` | `merge-pdf` | `pages/quick/MergePdfPage` |
| `tach-pdf` | `split-pdf` | `pages/quick/SplitPdfPage` |
| `nen-pdf` | `compress-pdf` | `pages/quick/CompressPdfPage` |
| `pdf-sang-word` | `convert-file` | `pages/quick/ConvertFilePage` |
| `ocr-van-ban` | `ocr` | `pages/quick/OcrPage` |
| `anh-sang-van-ban` | `image-to-text` | `pages/quick/ImageToTextPage` |
| `anh-sang-pdf` | `images-to-pdf` | `pages/quick/ImagesToPdfPage` |
| `ky-tai-lieu` | `sign-pdf` | `pages/quick/SignPdfPage` |
| `so-sanh-tai-lieu` | `compare-pdf` | `pages/quick/ComparePdfPage` |
| `chuyen-doi-anh` | `convert-image` | `tools/image/pages/ConvertImagePage` |
| `nen-anh` | `compress-image` | `tools/image/pages/CompressImagePage` |
| `cat-chinh-anh` | `crop-image` | `tools/image/pages/CropImagePage` |
| `anh-hang-loat` | `batch-image` | `tools/image/pages/BatchImagePage` |
| `che-dong-dau-anh` | `mark-image` | `tools/image/pages/MarkImagePage` |
| `anh-the` | `id-photo` | `tools/image/pages/IdPhotoPage` |
| `do-kich-thuoc-anh` | `measure-image` | `tools/image/pages/MeasureImagePage` |
| `huong-nha-la-ban` | `house-orientation` | `tools/orientation/pages/HouseOrientationPage` |
| `tao-ma-qr` | `qr-create` | `tools/qr/pages/QrCreatePage` |
| `tao-ma-vach` | `barcode-create` | `tools/qr/pages/BarcodeCreatePage` |
| `doc-ma-qr` | `qr-read` | `tools/qr/pages/QrReadPage` |
| `tinh-toan-nhanh` | `quick-calc` | `tools/utility/pages/QuickCalcPage` |
| `tinh-tien` | `money-calc` | `tools/utility/pages/MoneyCalcPage` |
| `tinh-ngay` | `date-calc` | `tools/utility/pages/DateCalcPage` |
| `chuyen-doi-don-vi` | `unit-convert` | `tools/utility/pages/UnitConvertPage` |
| `dem-ky-tu` | `char-count` | `tools/utility/pages/CharCountPage` |
| `mau-sac` | `color` | `tools/utility/pages/ColorPage` |
| `tao-ma-ngau-nhien` | `random-code` | `tools/utility/pages/RandomCodePage` |
| `ghi-chu-nhanh` | `quick-note` | `tools/utility/pages/QuickNotePage` |

Không còn công cụ "Sắp có" nào (0/33) từ 03/10/2026 — cơ chế `status: 'soon'`
vẫn giữ cho công cụ sau này. Thẻ "Tra cứu mã bưu chính" đã gỡ 03/10/2026 — không
có bộ dữ liệu có phiên bản thì không hứa.

Link cũ `?tool=merge` và slug viết hoa được `replace` về đường dẫn chuẩn; slug
lạ và slug của công cụ "Sắp có" về trang chọn — đều **ở lại nhánh đang đứng**
(`hub/utils/tool-lookup.ts`). **Đổi slug là gãy mọi link đã phát ra.**

Trình chỉnh sửa không còn "ý định theo slug" (`utils/tool-intent.ts` đã gỡ):
việc làm nhanh có công cụ riêng, nên thanh gợi ý của trình chỉnh sửa chỉ dựa
vào tệp vừa thả (`utils/suggest-actions.ts`).

## Công cụ nhanh — chọn tệp → chạy → kết quả

Mười hai công cụ dùng chung một khung ba bước: bảy công cụ làm trên CẢ TỆP
(Ghép, Tách, Nén, Chuyển đổi, OCR, Ảnh → Văn bản, Scan ảnh → PDF) và năm công cụ
làm trên TỪNG TRANG (PDF → Ảnh, Sắp xếp PDF, Đánh số trang, Đóng dấu PDF, Che
thông tin PDF — thêm 03/10/2026). Phần xử lý là **cùng engine** với trình chỉnh sửa
— không có bản thứ hai của logic ghép / nén / OCR.

| Tầng | File | Lo việc gì |
| --- | --- | --- |
| Khung (hub) | `hub/components/flow/{ToolFlow,FilePicker,FileList,FlowProgress,FlowResult}` · `useFlowRun` | Bố cục ba bước, tiến độ + huỷ, màn kết quả. Chỉ biết `FlowFile` / `FlowTask` / `FlowResult` |
| Tệp đầu vào | `hooks/useQuickSources.ts` | Nạp tệp qua `ingestFile`, từ chối sai loại, trần trang, PDF mật khẩu, ảnh thu nhỏ, thứ tự |
| Vỏ chung | `components/quick/QuickToolShell.tsx` | Nối hai tầng trên; lời mời đăng nhập, "Sửa tiếp", hộp mở khoá |
| Việc cần làm | `services/quick-tasks.ts` (cả tệp) · `services/page-tasks.ts` (từng trang) | Mỗi công cụ một hàm trả `FlowTask` |
| Vùng làm việc trên trang | `components/quick/{StageHead,PageCanvas,OrganizeStage,DecorationStage,RedactStage,RedactOverlay}` | Thay danh sách tệp khi công cụ cần thấy trang: lưới trang, xem trước số trang / dấu, khoanh vùng che |
| Dựng tệp | `services/doc-build.ts` | Dựng PDF / tách / ảnh / Word / Excel / lô và **trả về tệp** |
| Trang | `pages/quick/*Page.tsx` | Tuỳ chọn riêng của công cụ + điều kiện chạy (`blocked`) |

- **`doc-build` trả về tệp, không tải xuống.** Trước đây `useDocExport` vừa dựng
  vừa `downloadBlob` nên không có gì để đưa lên màn kết quả. Giờ hook của trình
  chỉnh sửa gọi `doc-build` rồi mới tải — hành vi của trình chỉnh sửa giữ nguyên.
- **Cache của engine là cấp module** (tài liệu pdf.js, ảnh thu nhỏ, lớp chữ +
  kết quả OCR…) và dùng chung giữa trình chỉnh sửa với công cụ nhanh. Mỗi màn tự
  nhả khi unmount (`useQuickSources` gọi `releaseCaches()`).
- **`useQuickSources` xin ảnh thu nhỏ MỘT lần cho mỗi nguồn, không dùng cờ
  "alive" theo effect.** StrictMode chạy effect hai lần: lượt đầu bị huỷ cờ, lượt
  sau thấy "đã xin rồi" → ảnh thu nhỏ không bao giờ hiện, không lỗi nào báo.
- **Huỷ OCR = `stopOcr()`** (giết worker tesseract — nó không có lệnh huỷ);
  `recognize` ném lỗi, coi là huỷ khi `signal.aborted`, không hiện thành lỗi.
- **Tiến độ đếm theo trang**, mà sau trang cuối còn nén ảnh / gói .zip.
  `FlowProgress` đổi sang "Đang hoàn tất…" khi đã đủ 100% để khỏi trông như treo.
- **Nhiều tệp ở Nén / Chuyển đổi / OCR ra một .zip**, mỗi tệp vào một kết quả
  (cùng `buildBatch` với "xuất từng tệp riêng" của trình chỉnh sửa). Tách ra một
  nhóm thì trả thẳng PDF — .zip một tệp chỉ bắt giải nén thừa.
- **Nén so với TỆP GỐC người dùng đưa vào**, không so với bản dựng lại chưa nén
  như `compressionSummary` của trình chỉnh sửa. Tệp ra không nhẹ hơn thì màn kết
  quả nói thẳng ("Không nén thêm được", `tone: 'warning'`, khuyên giữ tệp gốc).
- **Màn kết quả**: Tải về · Xem trước (PDF / ảnh / chữ, mở tab mới) · Chia sẻ
  (chỉ khi `navigator.canShare({ files })` nhận tệp đó — Chrome trên Windows
  cũng có) · Làm lại (về bước chọn tệp, giữ tệp) · **Sửa tiếp** (chỉ khi kết quả
  là PDF). "Sửa tiếp" đưa tệp qua `services/handoff.ts` — một ô nhớ cấp module,
  `takeHandoff()` đọc **một lần** rồi rỗng — và trình chỉnh sửa nạp nó lúc mount.
  F5 ở trình chỉnh sửa là mất, như mọi tệp khác trong RAM.

- **Năm công cụ trên trang không có engine riêng.** Chúng là đường vào hẹp tới
  đúng phép của trình chỉnh sửa: Sắp xếp = `PageRef` đã dời / xoay / bỏ rồi
  `buildPdf`; Đánh số trang và Đóng dấu = `Decorations` (đầu-chân trang,
  watermark) qua `resolveDecorations`; Che thông tin = markup `redact` (xoá
  thật — trang được dựng lại thành ảnh 200 DPI). Sửa hành vi ở engine là đổi cả
  hai nơi, và golden của cả hai bắt được.
- **`stage` của `QuickToolShell` là HÀM nhận cờ "đang chạy"** (`(running) =>
  ReactNode`), không phải node: lượt chạy do vỏ giữ, mà vùng làm việc phải khoá
  nút khi đang dựng tệp. Có `stage` thì danh sách tệp không vẽ — vùng làm việc
  tự có nút "Bỏ tệp" (`StageHead`).
- **Dấu ảnh / logo** (`ImageStamp`, "Đóng dấu PDF" và "Chèn chữ ký" dùng — trình
  chỉnh sửa chưa có ô chọn): `Decorations.imageStamp` là trường TUỲ CHỌN để state của trình
  chỉnh sửa không phải đổi. Ảnh được vẽ lại qua canvas trước khi nhúng
  (`services/stamp-image.ts`: pdf-lib bỏ qua hướng EXIF, thu về cạnh dài 2000
  px), nhúng MỘT lần cho mọi trang. Vị trí tính bằng `layoutImageStamp` — bản
  xem trước và lúc xuất dùng chung hàm đó; đặt theo trang NHÌN THẤY nên trang có
  `/Rotate` dấu vẫn đứng thẳng.
- **Xem trước của Đánh số trang / Đóng dấu chọn trang ĐẦU TIÊN TRONG PHẠM VI**,
  không phải trang 1: đang "bỏ trang đầu" mà xem trước trang bìa là một trang
  trống trơn, trông như công cụ hỏng.
- **Sắp xếp PDF giữ việc đã sắp khi thêm / gỡ tệp** (`utils/organize.ts`
  `syncOrganized`): trang của tệp còn lại giữ chỗ, góc xoay, trạng thái đã bỏ;
  tệp mới nối vào cuối. State được chỉnh NGAY trong lượt render (không qua
  effect) để lưới không nháy một nhịp với trang của bộ tệp cũ.
- **Che thông tin PDF**: khung lưu theo pt của trang nhìn thấy (công cụ nhanh
  không xoay thêm nên trùng khung gốc của markup `redact`). Bấm vào khung đã vẽ
  là bỏ khung; ngón tay xê dịch dưới 4 pt vẫn tính là bấm. Tệp ra không mang
  Author của tệp gốc (`assemblePdf` không chép metadata). Bài thử khôi phục ở
  `check-page-tools.mjs`: chữ dưới khung không đọc ra, luồng nội dung của trang
  gốc không còn ở BẤT KỲ đâu trong tệp, trang đã che chỉ gồm một ảnh — và phép
  thử tự chứng minh nó bắt được (luồng của trang không che phải tìm thấy).
- **Chèn chữ ký** (`ky-tai-lieu`, tên cũ "Ký tài liệu" — đổi vì đây là HÌNH chữ
  ký, không phải chữ ký số; màn tuỳ chọn và màn kết quả đều nói rõ). Chữ ký là
  một `ImageStamp` có thêm `spots` (id trang → tâm từng chữ ký, tỉ lệ 0–1 của
  trang nhìn thấy): có `spots` thì `anchor` / `margin` / `scope` **không được
  đọc tới**, chỉ trang có tâm mới được vẽ (`resolveDecorations`, `stampRects`).
  Lưu TÂM theo tỉ lệ chứ không lưu khung: đổi "bề rộng chữ ký" sau khi đặt thì
  mọi chỗ đặt co giãn quanh tâm của nó. `layoutStampAt` kẹp cả khung trong
  trang — bản xem trước (`SignOverlay`) và lúc xuất dùng chung hàm đó. Ảnh nhúng
  MỘT lần cho mọi chỗ đặt. Nét vẽ tay lưu theo hệ 600 × 220 của ô ký
  (`utils/signature.ts`), xuất PNG nền trong suốt **cắt sát nét**
  (`services/signature-image.ts`). Đổi nguồn (vẽ tay ↔ ảnh) là bỏ ảnh của nguồn
  kia khỏi trang. Bấm vào chữ ký đã đặt mà không kéo = bỏ; chữ ký vừa đặt bằng
  chính lần bấm đó thì không. Chữ ký không được lưu lại sau khi rời màn.
- **So sánh tài liệu** (`so-sanh-tai-lieu`): so CHỮ theo từng dòng, xác định,
  không AI (`utils/text-diff.ts` — Myers, cắt đầu / đuôi chung trước). Tệp đứng
  trước là bản cũ. Vượt 1500 dòng khác nhau thì phần giữa báo "bỏ hết rồi thêm
  hết" kèm cảnh báo, không treo tab. Tệp không có lớp chữ → **báo lỗi**, không
  báo "giống nhau" (hai bản scan khác hẳn nhau cũng ra 0 dòng khác). Tệp ra là
  báo cáo `.txt` (`-` bản cũ, `+` bản mới), màn kết quả hiện luôn nội dung đó
  qua `FlowResult.text` + `textLabel`. **Chưa có**: so trong từng dòng (chữ nào
  đổi), xem hai bản cạnh nhau có tô màu, so hình / định dạng, tệp Word.
- **PDF → Ảnh trùng việc với "Chuyển đổi file" có chủ ý**: cùng `convertTask`,
  khác đường vào — người tìm "pdf sang ảnh" không phải đi qua màn có Word /
  Excel. Đừng tách engine.

- **"Scan ảnh → PDF" có thêm nút "Chụp ảnh"** (`pickerExtra` của
  `QuickToolShell` → `CameraCapture` của feature ảnh). Ảnh chụp đi vào đúng
  đường của tệp chọn từ máy (`addFiles`), nên mọi luật nạp tệp vẫn áp dụng.

Cờ `appConfig.docTools` (`VITE_DOC_TOOLS`, mặc định bật): đặt `0` thì cả hai
nhánh route và mục menu không được khai — chưa đăng nhập bị đẩy về `/login`, đã đăng nhập ra 404.

## Công cụ ảnh

Bảy công cụ — Chuyển đổi ảnh, Nén ảnh, Cắt & chỉnh ảnh, Đo kích thước ảnh, và
từ 03/10/2026: Ảnh hàng loạt, Che & đóng dấu ảnh, Ảnh thẻ & In ảnh — và cửa sổ
camera, ở `src/features/tools/image/`. Feature riêng, **không** dùng engine PDF;
chỉ dùng chung khung ba bước của hub. `index.ts` chỉ xuất `CameraCapture`: các
trang do route nạp lười theo đường dẫn sâu.

| Tầng | File | Lo việc gì |
| --- | --- | --- |
| Tệp đầu vào | `services/image-intake.ts` · `hooks/useImageFiles.ts` · `shared/utils/image-header.ts` | Nhận JPG / PNG / WebP theo **chữ ký byte** (không tin đuôi tệp), từ chối HEIC bằng câu riêng, trần 100 MB và 80 triệu điểm ảnh đọc từ header trước khi giải mã, ảnh thu nhỏ |
| Giải mã / mã hoá | `services/image-codec.ts` | `decodeImage` (đã xoay theo EXIF), canvas → tệp, dò khả năng ghi WebP |
| Việc cần làm | `services/image-tasks.ts` (chuyển, nén) · `services/batch-tasks.ts` (hàng loạt) · `services/edit-tasks.ts` + `crop-render.ts` / `measure-render.ts` / `mark-render.ts` / `photo-sheet.ts` (cắt, đo, che + đóng dấu, ảnh thẻ) | Mỗi công cụ một hàm trả `FlowTask` |
| Trạng thái đang chỉnh | `utils/crop-state.ts` + `hooks/useCropEdit.ts` · `utils/measure-state.ts` + `hooks/useMeasure.ts` | Khung cắt / số đo của ảnh đang mở |
| Vỏ chung | `components/ImageToolShell.tsx` | Nối `useImageFiles` với `ToolFlow`, lời mời đăng nhập |
| Camera | `hooks/useCamera.ts` · `components/CameraCapture.tsx` | Xin quyền, chụp nhiều ảnh, cắt tay, trả về tệp JPG |

- **Ảnh hàng loạt** (`utils/batch.ts`): đổi cỡ (cạnh dài / rộng / cao / phần
  trăm — **không bao giờ phóng to**), đổi định dạng, đổi tên theo mẫu `{name}`
  `{n}` (số đệm 0 theo số lớn nhất của lô, tên trùng thêm "(2)"). Ảnh không cần
  đổi cỡ lẫn định dạng được trả **nguyên từng byte**, chỉ đổi tên. Không có "gỡ
  metadata": trái quyết định giữ EXIF bên dưới.
- **Che & đóng dấu ảnh**: khung che là khối đen ghi thẳng vào điểm ảnh (nới ra
  mép điểm ảnh — khung lẻ nửa điểm để lại viền mờ còn đọc được), không có lớp nào
  để gỡ; ảnh xem trước nhúng trong EXIF bị xoá như mọi ảnh vẽ lại. **Bản xem
  trước và tệp ra dùng chung MỘT hàm** `paintMarks` (`mark-render.ts`) — mọi số
  đo của dấu tính theo canvas đang vẽ, nên ảnh thu nhỏ 1600 px và ảnh gốc 12 MP
  ra cùng bố cục. Cỡ chữ theo cạnh NGẮN; dòng dài tự thu cho vừa chiều rộng. Màu
  dấu (`MARK_COLOR`) là màu ghi vào ảnh, không theo theme. Lớp vẽ khung
  (`MarkOverlay`) là bản riêng của feature ảnh — `RedactOverlay` bên `pdf/` cùng
  ý tưởng nhưng feature không import nội bộ feature khác.
- **Ảnh thẻ & In ảnh**: cỡ ảnh và khổ giấy khai bằng MILIMÉT
  (`config/photo-presets.ts`), bố cục tính bằng mm (`utils/photo-layout.ts`) rồi
  mới đổi sang px (JPG 300 DPI) hoặc pt (PDF). Ba kiểu tệp ra: **PDF** (số đo
  thật, ảnh nhúng MỘT lần ≤ 600 DPI — pdf-lib nạp bằng `await import()` lúc
  xuất), **tờ JPG 300 DPI**, **một ảnh thẻ**. Canvas ghi JPG "không đơn vị" nên
  `utils/jpeg-density.ts` sửa khối JFIF thành 300 DPI — thiếu bước này phần mềm
  in coi ảnh là 72 / 96 DPI và in to gấp ba. Preset **chỉ ghi kích thước, không
  ghi tên giấy tờ** (quy định ảnh của từng loại hồ sơ công cụ không kiểm được).
  Lưới căn giữa, không tự xoay ảnh / giấy để nhét thêm. Tờ in không mang EXIF
  (bố cục mới, màn kết quả nói rõ); ảnh thẻ đơn thì có. Khung cắt dùng lại
  `CropStage` + `CropBox` qua prop `aspect`. **Chưa có**: đổi nền, kiểm vị trí
  khuôn mặt, crop marks kiểu vạch góc (hiện là viền xám quanh từng ảnh).
- **Vì sao `FlowChoice` / `LoginNudge` nằm ở hub chứ không ở doc-tools**: cả hai
  feature cùng dùng, mà `index.ts` của doc-tools xuất cả `DocToolsPage` — import
  từ đó là kéo cả trình chỉnh sửa (pdf.js, pdf-lib) vào gói của công cụ ảnh.
- **EXIF (ngày chụp, GPS) là thứ phải GIỮ** — quyết định 03/10/2026: ảnh hiện
  trường dùng làm bằng chứng, không gỡ dù spec v2.0 §13 ghi "gỡ mặc định". Canvas
  mã hoá ra ảnh trơn, nên nén / cắt / đo ra JPG phải chép khối EXIF của ảnh gốc
  sang (`services/image-exif.ts` → `shared/utils/jpeg-exif.ts`). Khối chép sang bị
  sửa ba chỗ, thiếu chỗ nào cũng sai: cờ hướng về 1 (điểm ảnh đã xoay đứng lúc
  giải mã — giữ cờ cũ là xoay hai lần), kích thước điểm ảnh, và **xoá ảnh xem
  trước nhúng** (nó là ảnh TRƯỚC khi cắt: để lại thì phần vừa cắt bỏ vẫn nằm
  trong tệp). Nguồn JPG / PNG (`eXIf`) / WebP (`EXIF`) đều đọc được
  (`shared/utils/png-webp-exif.ts` — PNG và WebP để khối này SAU dữ liệu ảnh nên
  phải đọc cả tệp). Ra JPG và PNG thì giữ; **ra WebP là mất**, và màn kết quả
  phải nói ra — `exifNotes` đếm theo TỪNG ảnh, vì câu chung cho cả lô từng nói
  "không còn GPS" trong khi nửa lô vẫn còn. Bước nạp của `pdf/` (`ingest.ts`)
  cũng vẽ lại mọi ảnh JPG có cờ xoay — tức gần hết ảnh chụp dọc bằng điện thoại
  — nên chép EXIF sang theo cùng cách. Nén PDF (`pdf-compress`) mã hoá lại ảnh
  JPEG bên trong cũng chép EXIF sang, nhưng **giữ nguyên cờ hướng**
  (`exifForRedraw(…, 'as-is')`): PDF bỏ qua cờ đó nên ảnh được giải mã không
  xoay. Còn hở: ảnh PNG nhúng vào PDF (pdf-lib giải ra Flate, EXIF không có chỗ
  ở).
- **Không mã hoá lại khi không cần**: chuyển đổi gặp ảnh đã đúng định dạng thì
  giữ nguyên từng byte; nén ra tệp không nhẹ hơn thì trả lại tệp gốc (và báo
  "Không nén thêm được" khi không ảnh nào nhẹ đi). PNG không mất dữ liệu nên chỉ
  nhẹ đi khi có thu nhỏ cạnh dài.
- **Safari không ghi được WebP**: `toBlob('image/webp')` lặng lẽ trả về PNG.
  `canEncodeWebp()` hỏi trước để ẩn lựa chọn đó; `encodeCanvas` còn so `blob.type`
  với định dạng đã xin. Canvas vượt trần của trình duyệt cho ra `null` chứ không
  ném lỗi — cũng bắt ở `encodeCanvas`.
- **Khung cắt và số đo được giữ kèm id của ảnh** (`useCropEdit`, `useMeasure`),
  không dùng effect để đặt lại khi đổi ảnh — eslint cấm `setState` trong effect,
  và đặt lại bằng effect thì có một khung hình vẽ khung cắt cũ lên ảnh mới.
- **Độ sáng / tương phản có hai bản phải khớp nhau** (`utils/adjust.ts`): xem
  trước bằng CSS `filter` (`adjustFilter`), tệp ra tính bằng bảng tra
  (`adjustLut`) theo đúng công thức của CSS. Sửa một bên là ảnh lưu ra khác ảnh
  đang thấy.
- **Khoá tỉ lệ khi kéo góc: chiều bị kéo nhiều hơn thì dẫn** (`resizeRect`). Bản
  đầu lấy chiều *lớn* hơn — kéo ngang vào trong và phím mũi tên (chỉ đổi một
  chiều) không thu nhỏ được khung, không lỗi nào báo.
- **Số đo vẽ hai lần bằng hai công nghệ**: trên màn hình là SVG + nhãn HTML
  (`MeasureCanvas`), tệp lưu ra vẽ lại bằng canvas (`measure-render.ts`). Đổi
  kiểu nét / vị trí nhãn phải đổi cả hai. Màu nét lấy từ token của theme đang
  bật lúc bấm lưu (`useThemeTokens`).
- **Đo cần một đoạn chuẩn**: đánh dấu một vật đã biết chiều dài rồi nhập số
  thật; chưa có thì số đo tính bằng px. Ô nhập chiều dài giữ chuỗi đang gõ
  (`ReferenceLength`) và nhận cả dấu phẩy — dùng `type="number"` có kiểm soát thì
  gõ tới "2," là ô bị xoá. Số đo chỉ đúng với thứ nằm cùng mặt phẳng với đoạn
  chuẩn trên ảnh chụp thẳng góc; giao diện nói rõ điều đó.
- **Camera chỉ chạy ở secure context** (HTTPS hoặc `localhost`): mở app bằng
  `http://<IP LAN>` thì cửa sổ chụp báo lý do thay vì khung ngắm — không phải
  lỗi. StrictMode chạy effect hai lần nên có hai luồng được mở; luồng tới muộn
  phải bị tắt ngay, không thì đèn camera sáng mãi sau khi đóng cửa sổ.
  `<video>` phải ở trong cây cả lúc đang cắt ảnh (gỡ ra là mất luồng). Nút đèn
  chỉ hiện khi track khai `torch` (Chrome trên Android). Một lượt tối đa 50 ảnh.
- **Chưa có**: tự dò mép giấy (thẻ "Tự động cắt" của mẫu — chỉ cắt tay), HEIC,
  phóng to ảnh khi đo, đặt điểm đo bằng bàn phím (chỉ chỉnh được điểm đã đặt).
- **Không còn bản trùng với `pdf/`** (gộp 03/10/2026 vào `tools/shared/`): một
  bộ ghi .zip (`createZipWriter` — tự đánh số tên trùng, **không phân biệt hoa
  thường** vì `A.jpg` và `a.jpg` giải nén ra Windows / macOS là đè nhau), một bộ
  đọc header ảnh (`pdf/` dùng chung, chỉ giữ riêng phần nhận PDF và vẫn từ chối
  WebP vì pdf-lib không nhúng được), một hàm mã hoá canvas (`canvasToBlob` — bắt
  hai lỗi câm: canvas quá lớn trả `null`, định dạng không ghi được trả PNG; bảy
  chỗ tự gọi `toBlob` trong `pdf/` đã chuyển sang nó). Tải tệp về dùng
  `downloadOutput` của hub. Mọi trần ở `hub/config/limits.ts`.

## Hướng nhà & la bàn (`features/tools/orientation`)

Spec: `ERPCons_Huong_Nha_La_Ban_FINAL_v1.1_DEV_READY`. Một màn, nhóm `home`.
Nguồn: ảnh (qua `intakeImage` của `image/`), MỘT trang PDF (pdf.js nạp động,
vẽ cạnh dài 1800px để làm việc), hoặc không ảnh (la bàn đứng riêng). Ba cách
lấy hướng: la bàn máy (`useDeviceHeading`, xin quyền chỉ khi bấm, người dùng
tự chốt số), số đã biết, mũi tên Bắc đặt trên bản vẽ.

| Phần | Ở đâu | Ghi chú |
| --- | --- | --- |
| Trạng thái + hoàn tác | `utils/orientation-state.ts` + `utils/history.ts` | Một reducer; kéo = `checkpoint` lúc bắt đầu + hành động `transient`; đổi nguồn là `restart` (xoá ngăn hoàn tác — toạ độ cũ vô nghĩa trên nguồn mới) |
| Toán hướng | `utils/azimuth.ts` | 0° = Bắc, chiều kim đồng hồ; số rơi đúng ranh giới cung thuộc cung SAU |
| La bàn | `utils/compass-geometry.ts` | MỘT danh sách hình cho cả SVG (`ShapeLayer`) lẫn canvas lúc xuất (`compass-draw.ts`) — xem trước = tệp ra |
| Vẽ lại sơ đồ | `utils/trace.ts` | Đường gắn nhãn mặt tiền / cửa chính sinh trục vuông góc, kéo tường là trục đi theo |
| Theo tuổi | `config/rule-profiles.ts` + `utils/rule-engine.ts` | Luật là DỮ LIỆU có `version`; sửa luật = thêm phiên bản. Luật hỏng chỉ hỏng phần theo tuổi |
| Mặt trời | `utils/solar.ts` + `utils/sun-exposure.ts` | Thuật toán NOAA, tính tại máy; vị trí hỏi một lần khi bấm, không lưu |
| Xuất | `services/orientation-export.ts` | Ảnh: vẽ đè + chép EXIF gốc. PDF nguồn → PDF: trang gốc nhúng **vector** (`embedPage`, xử lý `/Rotate`) + lớp PNG trong suốt; pdf-lib không mở được thì lùi về vẽ lại thành ảnh và báo |

- **EXIF giữ nguyên, kể cả GPS** — lệch spec v1.1 §17 ("gỡ metadata") có chủ
  đích, theo quyết định 03/10/2026 ở trên.
- Tệp xuất luôn dùng bảng màu theme **Sáng**, không theo theme đang xem.
- Không lưu gì: số đo, năm sinh, vị trí chỉ nằm trong RAM của tab. Bản ghi
  JSON (chế độ Chuyên môn) chỉ có số đo, không có dữ liệu theo tuổi.
- Loại Bắc (thật / từ / dự án) **chỉ là nhãn**, không tự quy đổi độ từ thiên.
- Chưa làm: cắt / xoay / nắn ảnh nguồn trước khi đo; tự hiệu chỉnh độ từ
  thiên; la bàn máy mới thử trên Chrome desktop (không có cảm biến) — chưa thử
  trên điện thoại thật.

## Tiện ích không cần tệp

Tám công cụ không đi qua luồng ba bước: gõ là thấy kết quả. Chia hai feature
theo thư viện phải tải — `tools/qr/` (kéo `qrcode`, `@zxing/*`, `bwip-js`) và
`tools/utility/` (không thư viện ngoài). Cả hai chỉ import hub; `index.ts` của
chúng chỉ xuất type, trang do route nạp lười theo đường dẫn sâu.

Danh mục đánh dấu các công cụ này bằng `noFile: true` → `ToolRoutePage` đổi dòng
cam kết thành "Chạy trên máy bạn — không gửi nội dung đi" (riêng "Đọc mã QR" có
nhận ảnh nên giữ câu "tệp không tải lên").

Khung chung là `ToolBoard` của hub: cột nhập bên trái, kết quả sống ở
`aside` bên phải (dùng lại lưới `.erp-flow`); màn hẹp thì kết quả xuống dưới.

| Công cụ | Chỗ chính | Điều đáng nhớ |
| --- | --- | --- |
| Tạo mã QR | `qr/utils/{qr-payload,qr-matrix}.ts` · `qr/services/qr-render.ts` | Loại mã: URL, văn bản, Wi-Fi, số điện thoại, email, danh thiếp (vCard 3.0 — họ tên + điện thoại hoặc email; màn Đọc QR hiện vCard dưới dạng chữ, chưa tách trường). Tải PNG (ô nguyên điểm ảnh, cạnh ≥ 1024) và SVG |
| Tạo mã vạch | `qr/utils/{barcode-check,barcode-batch,svg-paths}.ts` · `qr/services/{barcode-render,batch-file}.ts` | EAN-13, EAN-8, ITF-14, Code 128, Code 39 (`qr/config/barcode-kinds.ts`). Một mã hoặc cả lô từ CSV / Excel (cột đầu, ≤ 500 dòng). Tải PNG 300 dpi, SVG khổ mm, PDF vector mỗi mã một trang đúng khổ; lô ra PDF hoặc zip |
| Đọc mã QR / Barcode | `qr/services/qr-scan.ts` · `qr/hooks/useQrScanner.ts` · `qr/utils/scan-content.ts` | Ảnh từ máy, dán Ctrl+V, hoặc camera quét liên tục. EAN / UPC / ITF 14 số được kiểm số kiểm tra và đọc tiền tố GS1 |
| Tính toán nhanh | `utility/config/calc-formulas.ts` · `utility/utils/calc.ts` | Diện tích, thể tích, khối lượng thép / vật liệu; kết quả luôn kèm phép tính |
| Tính tiền & thuế | `utility/config/money-presets.ts` · `utility/utils/money.ts` | 10 phép: phần trăm (3), thuế & chiết khấu (3), lãi gộp (3), chia tiền. Mỗi phép có `id` + `version` (= `preset_id` / `formula_version` của spec), in cạnh kết quả; **tăng `version` khi cách tính đổi**. Thuế suất luôn nhập tay — không gắn sẵn con số nào. `parseMoney` khác `parseDecimal`: dấu theo sau bởi đúng ba chữ số là nhóm nghìn ("150.000" = 150 nghìn), nên đừng dùng nó cho kích thước. Không làm tròn theo quy định kế toán; chia tiền làm tròn LÊN nghìn |
| Tính ngày & thời hạn | `utility/utils/date-calc.ts` | Ngày lịch = số nguyên đếm theo UTC (không dính giờ mùa hè). Ngày làm việc **chỉ loại Thứ Bảy, Chủ nhật** — không có bảng ngày lễ, màn nói rõ điều đó. Ngày bắt đầu mặc định KHÔNG tính (cách đếm thời hạn), kể cả khi đếm ngược |
| Chuyển đổi đơn vị | `utility/config/units.ts` · `utility/utils/unit-convert.ts` | Chiều dài, diện tích, khối lượng — hệ số chính xác theo định nghĩa |
| Đếm ký tự | `utility/utils/text-stats.ts` | Đếm theo cụm chữ (`Intl.Segmenter`), không theo `length` |
| Màu sắc | `utility/utils/color.ts` | HEX ↔ RGB ↔ HSL, hút màu (`EyeDropper`, chỉ Chrome / Edge), tỷ lệ tương phản WCAG |
| Tạo mã ngẫu nhiên | `utility/utils/random-code.ts` | Mật khẩu và mã đơn / mã phiếu, sinh bằng `crypto.getRandomValues` |
| Ghi chú nhanh | `utility/services/notes-store.ts` · `utility/utils/notes.ts` | `localStorage`, khoá `erpcons.tools.notes` |

- **Một dấu đứng một mình là dấu THẬP PHÂN** (`parseDecimal` ở hub): "1.500" là
  một phẩy năm. Không đoán được ý người gõ, nên màn nào dùng hàm này phải **in
  lại con số đã hiểu** cạnh kết quả (phép tính ở Tính toán nhanh, dòng "2,5 ft ="
  ở Chuyển đổi đơn vị). Ô nhập là `type="text"` + `inputMode="decimal"`:
  `type="number"` có kiểm soát thì gõ tới "2," là ô bị xoá.
- **Hai cách in số, đừng lẫn**: `formatQuantity` (10 chữ số có nghĩa) cho đổi đơn
  vị — hệ số là chính xác; `formatResult` (3 chữ số thập phân, số < 1 giữ 4 chữ
  số có nghĩa) cho kết quả tính — kích thước đo bằng thước mà in 10 chữ số là độ
  chính xác giả.
- **Màu của mã QR chỉ lấy trong `QR_COLORS`** (`qr/config/qr-colors.ts`): toàn
  màu đậm của bảng token trên nền trắng. Không có cam / vàng / tím như mẫu — màu
  nhạt là máy quét cũ không đọc được, tím không có trong token. Nền luôn trắng
  kể cả ở theme Dark: mã in ra giấy, không đi theo theme.
- **Mã QR thử mức sửa lỗi M rồi mới lùi về L**; cả hai không chứa nổi thì báo
  "dài quá" chứ không tự cắt nội dung. Vùng trắng quanh mã (4 ô) nằm sẵn trong
  tệp tải về — người dùng cắt sát là mã khó đọc.
- **Quét camera tự giữ luồng và tự chụp khung hình**, không dùng
  `decodeFromConstraints` của zxing: hàm đó lúc dừng gỡ luôn nguồn của thẻ
  `<video>`, hai lượt mở sát nhau (StrictMode, bấm "Thử lại") thì lượt cũ gỡ
  luồng của lượt mới — ô ngắm đen, không lỗi nào báo. Camera chỉ chạy ở secure
  context (cùng luật với cửa sổ chụp ảnh; câu báo lỗi dùng chung ở
  `hub/utils/camera-error.ts`).
- **Đọc ảnh thử ba cỡ** (cạnh dài 1600 → 800 → 3000): mã nhỏ trong ảnh chụp xa
  cần ảnh lớn, mã chụp sát lại đọc tốt hơn khi thu nhỏ. PNG nền trong suốt được
  tô nền trắng trước (nền trong suốt giải mã ra đen, mã đen trên đen).
- **Nhánh `/tools` trong app tra luôn sổ truy xuất** cho mã dạng chữ / URL
  (`TraceScanCard` của `features/inventory/trace`, xem
  [trace.md](trace.md)); nhánh khách không gọi API nào.
- **Chỉ `http` / `https` mới thành nút "Mở …"** (`readScanContent`), và link mở
  bằng `rel="noopener noreferrer"`. `javascript:`, `file:`… chỉ hiện như chữ.
  Nút ghi rõ tên miền sẽ mở — mã QR dán đè là kiểu lừa có thật.
- **Mã vạch GS1 không bao giờ do công cụ "tạo số"**: EAN / ITF-14 chỉ vẽ số
  người dùng đã có (GS1 Việt Nam cấp). Thiếu số kiểm tra thì tự thêm và báo ra;
  số kiểm tra SAI thì từ chối chứ không sửa — sửa im lặng là in ra một mã của
  sản phẩm khác. Mã nội bộ (vật tư, tài sản) hướng sang Code 128.
- **Code 128 phải kiểm ở phía mình**: bwip-js nhận chữ có dấu mà không báo lỗi
  rồi vẽ ra mã máy quét đọc sai — `checkBarcode` chỉ cho ASCII in được.
- **Cỡ in theo vạch hẹp 0,33 mm × độ phóng** (`barcode-render.ts`). bwip-js ở
  `scale: 1` vẽ một vạch hẹp = 1 đơn vị và hiểu `height` là mm ở 72 dpi, nên
  chiều cao phải chia lại theo độ phóng. PNG dùng số NGUYÊN điểm ảnh mỗi vạch
  (vạch lẻ điểm ảnh bị làm mịn thành xám). Không căn giữa chữ cho EAN / ITF —
  phá bố cục chữ của chuẩn GS1. Mã luôn đen trên trắng ở mọi theme.
- **Lô bỏ dòng tiêu đề tự động**: dòng đầu không hợp lệ mà dòng thứ hai hợp lệ
  thì coi là tiêu đề cột. Ô số trong Excel đọc qua `cellText` để số dài không
  thành `8.93E+12`. Dòng lỗi liệt kê (50 dòng đầu) và bị loại khỏi tệp ra.
- **Mã ngẫu nhiên lấy mẫu loại bỏ** (`secureRng`), không dùng `% n`: chia dư
  làm lệch xác suất về các ký tự đầu bảng. Mật khẩu luôn có đủ mọi nhóm ký tự
  đã bật. Mã đơn bỏ `I O 0 1` vì đọc qua điện thoại hay nhầm. Trần mỗi lượt: 20
  mật khẩu, 100 mã.
- **Ghi chú là của TRÌNH DUYỆT, không của tài khoản**: không gửi đi đâu, ai dùng
  chung máy cũng đọc được, xoá dữ liệu duyệt web là mất — màn hình nói rõ, đừng
  gỡ câu đó. Dạng lưu `{ version: 1, notes: [{ id, title, body, tasks, updatedAt }] }`;
  trần 200 ghi chú · 20.000 ký tự · 100 việc (`NOTE_LIMITS`). `parseNotes` không
  tin kiểu dữ liệu đã lưu — mục hỏng bị bỏ, không làm hỏng cả kho. Kho nghe sự
  kiện `storage` để hai tab không ghi đè nhau; ghi không được (hết chỗ, chế độ
  riêng tư) thì vẫn giữ trong RAM và báo ra. "Ghi chú mới" dùng lại ghi chú còn
  trống thay vì tạo thêm.
- **Chưa có**: tra cứu mã bưu chính (cần dữ liệu ngoài), sào / mẫu ở đổi đơn vị
  (mỗi miền một trị số), đổi nhiệt độ / thể tích, mã QR có logo ở giữa, quét mã
  từ PDF, đồng bộ ghi chú theo tài khoản.

## Giới hạn cứng

Mọi trần đầu vào của MỌI công cụ (PDF, ảnh, QR) nằm ở một chỗ:
`hub/config/limits.ts` (`TOOL_LIMITS`). Đổi số ở đó, câu từ chối tự đổi theo
(`megabytes()`), không sửa từng công cụ. Căn cứ đo: registry mục 7.5.

| Giới hạn | Giá trị | Ở đâu | Vì sao |
| --- | --- | --- | --- |
| Dung lượng một tệp | 100 MB | `TOOL_LIMITS.fileBytes` | mọi byte nằm trong RAM tab |
| Số tệp một lượt | 100 | `batchFiles` | công cụ ảnh + công cụ PDF nhanh; giữ .zip ra và thời gian chờ ở mức chịu được |
| Tổng dung lượng đang giữ | 300 MB | `heldBytes` | chỉ công cụ GIỮ mọi tệp trong RAM (ghép, scan ảnh → PDF, trình chỉnh sửa): bộ nhớ tăng 5–6 lần dung lượng vào. Công cụ ảnh xử lý từng tấm rồi nhả nên không áp. Trình chỉnh sửa không đếm nguồn phái sinh (`originId`) |
| Tệp ra | cảnh báo trên 100 MB | `outputWarnBytes` | không chặn — `FlowResult` thêm một ghi chú: tệp không nạp lại được vào công cụ nào ở đây |
| Tổng số trang một phiên | 500 | `totalPages` | đo ở mục [Hiệu năng](#hiệu-năng) |
| Ảnh đầu vào | 80 triệu điểm ảnh; **50 triệu trên thiết bị cảm ứng** | `maxImagePixels()` | đọc header, chặn **trước** khi giải mã. Một ảnh 79 MP cần ~2 GB để đổi định dạng — quá sức một tab di động. "Cảm ứng" = `(pointer: coarse)` + có điểm chạm |
| Ảnh chụp một lượt mở camera | 50 | `cameraShots` | |
| Canvas khi vẽ / xuất ảnh | 16 triệu điểm ảnh, cạnh 8000 | `utils/canvas-cap.ts` | an toàn cho iOS; vượt thì hạ DPI và **báo DPI thật** |
| Kết quả tìm | 1000 | `MAX_HITS` | tìm "a" trên 500 trang là hàng chục nghìn chỗ |

## Mô hình dữ liệu

- `SourceFile` = `pdf` | `image` | `collage` (trang gộp 2/4 ảnh — không có byte
  riêng, trỏ tới ảnh gốc). **Byte của nguồn không bao giờ bị sửa.**
- `PageRef` = một thẻ trên lưới: `sourceId` + `pageIndex` + `rotation` (xoay
  thêm của người dùng) + `markups` + `sheet` (khổ giấy, chỉ trang ảnh).
- **Khung gốc**: mọi toạ độ dấu / vùng cắt / vùng xoá tính bằng pt, trục y đi
  xuống, **sau** `/Rotate` của tệp, **trước** xoay thêm của người dùng.
- **Nguồn dẫn xuất**: thao tác sửa nội dung một trang (cắt, điền form, chỉnh
  nghiêng) sinh một `SourceFile` mới rồi trỏ trang (giữ nguyên id) sang đó, trong
  **một** `dispatch({ type: 'edit' })` → một bước hoàn tác. Nguồn dẫn xuất mang
  `originId` = tệp người dùng đã thả vào (`originOf()`), để xử lý hàng loạt gom
  trang đúng tệp. Thêm một kiểu dẫn xuất mới mà quên `originId` thì trang đó
  thành một tệp riêng trong .zip hàng loạt.

## Chức năng

| Nhóm | Chức năng | Chỗ chính |
| --- | --- | --- |
| Trang | thả tệp, kéo xếp, xoay, nhân bản, xoá, chèn trước/sau, thay trang, hoàn tác | `hooks/useDocWorkspace.ts`, `utils/workspace-reducer.ts` |
| Ảnh | gộp 2/4 ảnh một trang, khổ A4/A3/Letter/vừa ảnh + lề, cắt trang | `services/page-edit.ts`, `utils/image-sheet.ts` |
| Chữ | tìm (bỏ dấu), sửa chữ **viết lại trang** (dòng dưới bị đẩy xuống), che chữ / tìm & thay phủ bề mặt, OCR tiếng Việt cục bộ | `useTextSearch`, `useTextEditSession`, `services/text-reflow.ts`, `utils/reflow-layout.ts`, `useFindReplace`, `services/ocr.ts` |
| Đánh dấu | tô, gạch, khung, mũi tên, nét tay, hộp chữ / ghi chú đổi cỡ, dấu mộc, **xoá thật** | `MarkupEditor`, `services/pdf-markup.ts`, `services/pdf-redact.ts` |
| Trang trí | số trang, đầu/chân trang, watermark | `services/pdf-decorate.ts` |
| Form | điền AcroForm (XFA báo không hỗ trợ) | `services/pdf-form.ts` |
| Bảo mật | mở PDF mật khẩu bằng mật khẩu người dùng (qpdf-wasm) | `services/pdf-unlock.ts`, `services/qpdf.ts` |
| Bản scan | trang trắng, trang nghiêng, viền tối quanh giấy | `utils/scan-analysis.ts`, `services/scan-cleanup.ts` |
| Xuất | PDF (nén ảnh, dấu in phẳng / annotation thật), tách, ảnh, Word, Excel, **từng tệp riêng (.zip)** | `hooks/useDocExport.ts`, `services/doc-build.ts`, `services/pdf-assemble.ts` |

Ghép PDF giữ form, link, tệp đính kèm, layer của tệp nguồn và báo phần bị mất
(`services/pdf-carryover.ts`).

## Bẫy đã vấp

- **`copyPages` của pdf-lib khử trùng theo object, không theo ref**: `/P` của
  annotation, `/B` của bead, Dest trỏ trang đều kéo theo bản sao trang mồ côi.
  Gỡ trước khi chép, gắn lại sau (`pdf-carryover.ts`).
- **Xoá thật = vẽ lại trang thành ảnh** (200 DPI, JPEG 0,92). Chỉ phủ khung đen
  thì chữ dưới khung vẫn chọn/tìm được. Lớp chữ ẩn chỉ giữ các mẩu chữ nằm
  **hoàn toàn ngoài** mọi khung — mẩu chạm khung bỏ cả mẩu.
- **Mỗi `setState` tiến độ làm cả lưới N thẻ render lại**: tiến độ chỉ cập nhật
  khi phần trăm nhích; nút bận dùng icon tĩnh (spinner quay làm xuất ảnh chậm 3,5×).
- **Hạ DPI không được im lặng**: bản vẽ A0 "300 DPI" thực ra ~100 DPI vì trần
  canvas — `renderPageImage` trả DPI thật và có toast.
- **Thư viện nặng nạp lười và nằm ngoài precache của SW** (`globIgnores` trong
  `vite.config.ts`): fontkit, docx, exceljs, bwip-js, lõi tesseract + worker, qpdf.wasm,
  PDFium (`pdfium-lib-*.js` + `pdfium.wasm` 4,6 MB, chỉ tải khi sửa chữ lần đầu).
  Dữ liệu `vie` của tesseract ở `public/vendor/tesseract/` vì tesseract ghép tên
  tệp cố định — qua Vite bị gắn hash là 404.
- Hai cảnh báo console `Parameter not found: language_model_ngram_on…` khi OCR
  là của tệp `vie` best_int, vô hại.
- `pdfjs-dist` v6 bỏ `PDFDocumentProxy.destroy()` → dùng `doc.loadingTask.destroy()`.
- **Phông của chữ sửa lại** (`utils/font-style.ts`, `services/pdf-fonts.ts`,
  `services/local-fonts.ts`): phông nhúng trong PDF thường chỉ còn các ký tự đã
  dùng nên không viết chữ mới bằng nó được. Thứ tự chọn: (1) phông cài trên máy
  người dùng qua Local Font Access (Chrome/Edge máy tính, hỏi quyền một lần —
  `requestLocalFonts()` phải gọi TRƯỚC mọi `await` trong trình xử lý bấm, không
  thì trình duyệt không hiện hộp hỏi); (2) Arimo / Tinos — cùng bề rộng ký tự
  với Arial / Times New Roman, đã cắt còn Latin + Việt + Hy Lạp và **bỏ kerning**
  (Word không kern mặc định). Be Vietnam Pro / Noto Serif chỉ còn cho con dấu,
  ghi chú, hộp chữ. Phông cấm nhúng (OS/2 fsType) và tệp gộp `.ttc` bị bỏ qua.
- **Sửa chữ = viết lại trang, ba bước, hai thư viện** (`services/text-reflow.ts`):
  pdf-lib tách trang thành tệp một trang → PDFium (`@embedpdf/pdfium`) gỡ các
  mảnh chữ của khối, dời mọi thứ bên dưới, sinh lại content stream → pdf-lib viết
  chữ mới bằng phông con và dời annotation. PDFium không nhúng được phông con
  Unicode gọn như pdf-lib nên không để nó viết chữ. Kết quả là một `PdfSource`
  một trang thay cho trang cũ (cùng kiểu với cắt trang) — hoàn tác đi qua lịch sử
  workspace, không có lịch sử riêng.
  - Bố cục tính trong **khung của khối chữ** (`utils/reflow-layout.ts`): `u` dọc
    theo chữ, `v` là chiều xuống dòng. Trang `/Rotate` và chữ dọc đi chung một
    đường; chỉ nhận góc bội của 90°.
  - **Khúc chữ, không phải cả dòng** (`segmentAround` trong `text-select.ts`):
    ngắt ở khoảng trống > 1 em (ô bảng), ở ký hiệu đầu dòng (vùng dùng riêng
    U+E000–F8FF của phông Symbol) và ở số thứ tự đầu dòng cách chữ > 0,3 em.
    Thiếu bước này thì sửa một dòng danh sách kéo theo cả "•" và hàng bảng kéo
    theo mọi ô.
  - **Đoạn văn phải tự suy ra** (`utils/text-paragraph.ts`) — PDF chỉ có các dòng
    rời. Nối hai dòng khi: cùng cỡ chữ, cách đều (lệch ≤ 0,12 cỡ chữ), thẳng mép
    trái, không có nét kẻ ngang ở giữa, và dòng trên **đầy** (từ đầu của dòng
    dưới không chen lên được). Mọi chỗ chưa chắc nghiêng về KHÔNG nối: nối nhầm
    là sửa đoạn này kéo chữ đoạn kia chảy lên. "Cùng kiểu chữ" so bằng đậm /
    nghiêng chứ không bằng tên phông — Word ghi chữ Latin và chữ có dấu của cùng
    một dòng bằng hai phông.
  - "Đầy" đo tới **mép phải của cột**, và cột lấy từ các dòng LIỀN KỀ chứ không
    từ cả trang: đi lên / xuống từ dòng được bấm (qua cả chỗ cách đoạn, tới 3,5
    cỡ chữ), gom những dòng cùng dải ngang, dừng ở dòng vắt sang chữ bên phải.
    Mép cột là mép phải xa nhất của chồng dòng ấy — nhưng chỉ khi chồng ấy ra
    dáng cột chữ (`looksLikeColumn`, dùng chung với `reflow-zones.ts`) và có ≥ 3
    dòng thật sự có chữ đứng bên phải. Không đủ thì lùi về cách cũ (mép phải xa
    nhất của mọi dòng chồng lên dòng này trên cả trang). Lấy cả trang thì trang
    hai cột có một đoạn trải hết bề ngang là mọi dòng của cột thành "chưa đầy" —
    bấm vào đoạn chỉ được một dòng. Không có rào `looksLikeColumn` thì danh sách
    "nhãn — giá trị" bị nối thành một đoạn. Từ đầu dòng dưới đo bằng CHÍNH hàm
    đo chữ của trang, không chia đều bề rộng dòng theo số ký tự: chia đều thì từ
    toàn chữ hẹp ("il") và từ toàn chữ rộng ("mm") cho kết quả ngược nhau.
  - Mép ngắt dòng = mép phải của cột chữ, dừng trước chữ cùng hàng bên phải và
    nét kẻ dọc mảnh (≤ 3 pt); không bao giờ hẹp hơn chữ gốc.
  - Giãn dòng lấy từ chính khối, không có thì từ dòng kế bên trong 0,9–2 lần cỡ
    chữ. **Dòng kế bên bị ngăn bởi nét kẻ ngang thì bỏ qua** — không thì ô bảng
    lấy chiều cao hàng (21 pt) làm giãn dòng thay vì 13 pt.
  - Chữ dời theo **đường chân chữ**, hình / nét kẻ dời theo mép trên: khung bao
    của chữ ôm sát nét, dòng toàn chữ thường thấp hơn dòng có chữ hoa — xét
    theo mép trên là dòng giãn sát bị bỏ lại.
  - **Dời vật phải dời cả vùng cắt của nó** (`FPDFPageObj_TransformClipPath`).
    Word cắt chữ và nền của TỪNG ô bảng bằng một vùng cắt riêng; `Transform`
    chỉ dời vật, vùng cắt ở lại → mọi hàng bên dưới chỗ sửa mất chữ, không lỗi
    nào báo, và lớp chữ (tìm, sao chép) vẫn còn nguyên nên test đọc chữ không
    thấy. Chrome và LibreOffice không sinh vùng cắt theo ô — phải thử bằng tệp
    Word thật hoặc mẫu `bang-cat.pdf`, và soi **điểm ảnh** trên canvas.
  - Viền dọc và nền của hàng đang sửa bắt đầu từ phía trên khối nên không bị
    dời, trong khi viền hàng dưới đã đi → bảng hở đúng một đoạn. Chúng được
    **kéo dài** (giữ mép trên, mép dưới đi theo), nhưng chỉ khi mép dưới NỐI
    với một vật bị dời: khung viền trang, nền trang cũng vắt qua khối. Word và
    Chrome vẽ viền bằng hình chữ nhật mảnh tô đặc nên kéo dài không làm dày nét.
  - **Không phải mọi thứ bên dưới đều bị đẩy** (`utils/reflow-zones.ts`, tính
    một lần trong `planReflow`, đi theo `ReflowPlan.zones`). *Chân trang*: cụm
    chữ thấp nhất nằm trong 15% đáy trang và cách phần trên ≥ 1,2 lần giãn dòng
    thì đứng yên; thân bài bị đẩy chạm mép trên của nó là "tràn". *Cột bên
    cạnh*: thử từng mép trái của chữ nằm bên phải khối (bên trái thì lật trục),
    nhận là cột khi ngay trước mép ấy là khe trống ≥ 2 cỡ chữ, hai bên khe đều
    ra dáng cột chữ (≥ 6 dòng, rộng ≥ 12 cỡ chữ, quá nửa số dòng chạy đầy, dòng
    sát nhau). Vùng mà cột THẤP hơn chưa cao tới 40% trang phải qua thêm
    `startsAlign` (xét cột thấp: cột kia hay bị tiêu đề phía trên và dòng kết
    ngắn phía dưới — không vắt qua khe — kéo cao lên): các đoạn hai bên mở đầu NGANG HÀNG nhau (mọi chỗ sang đoạn của bên ít đoạn hơn khớp
    với bên kia) là bảng không viền có ô nhiều dòng, không phải hai cột — hai
    cột chữ chảy tự do thì đoạn bên này sang dòng chỗ nào chẳng liên quan bên
    kia. Vùng cao không thử: hai cột dài có đoạn tình cờ ngang hàng là chuyện
    thường. Vùng nhiều cột kết thúc ở vật
    đầu tiên **vắt ngang khe** — nét kẻ ngang của bảng cũng vắt qua khe, nên
    bảng có viền không bao giờ bị nhận nhầm. Phần dưới vùng nhiều cột dời theo
    `tailDelta` riêng (cột đang sửa dài ra mà vẫn ngắn hơn cột kia thì nó đứng
    yên; cột ngắn lại cũng không được kéo nó đè lên cột kia). Dấu tay và
    annotation hỏi cùng một luật qua `shiftOf()`. Đoán sai theo hướng nào cũng
    hỏng (bảng không viền bị xé hàng / chữ đè chân trang) nên ngưỡng nào cũng
    chặt — không chắc thì đẩy tất cả. Chữ dọc không xét hai thứ này.
  - **Tràn thì sang trang mới** (`spillCuts` trong `reflow-layout.ts`). PDF
    không ghi lề nên `bodyBounds` suy ra: lề trên = mép trên của vật cao nhất
    (kẹp 18 pt … 15% trang), lề dưới bằng lề trên, không lấn chân trang; trang
    đã đầy quá mức ấy thì mép dưới là chỗ nội dung đang chạm tới. Cắt ở **mép
    trên của mảnh đầu tiên không còn vừa** (chữ xét theo chân chữ), mọi thứ từ
    đó trở xuống sang trang sau và đặt lại từ lề trên; phần tràn cao hơn một
    trang thì cắt tiếp thành nhiều trang. Mỗi trang tràn dựng lại từ CHÍNH tệp
    một trang của trang gốc: PDFium gỡ mọi vật không thuộc trang đó — nên phông,
    ảnh, vùng cắt của ô bảng đi theo nguyên vẹn, còn nền, chân trang, cột bên
    cạnh ở lại trang gốc. Trang tràn bị gỡ `/Names` (không thì tệp đính kèm có
    hai bản khi xuất). Liên kết, ghi chú, **ô form** của phần bị cắt đi theo —
    khung nào thuộc trang nào xét theo TÂM khung (`placeOf`): ô form và vùng bấm
    của liên kết cao hơn dòng chữ chúng đi kèm, xét theo mép trên là nhãn sang
    trang còn ô ở lại. Ô form đã chia theo trang thì cây form cũng phải chia:
    mọi tệp của cụm đều mang đủ cây form của trang gốc, nên `pruneFormToPages()`
    (`pdf-carryover.ts`) tỉa mỗi tệp về đúng trường của những ô nó đang mang —
    không tỉa thì bảng "Điền form" hiện mỗi trường hai lần và khi xuất bản thứ
    hai bị đổi tên `_2`. Giá trị nằm ở từ điển trường nên đi theo ô.
    Các khung đi kèm ấy (annotation của trang + dấu tay, `riders` của
    `planShift`) cũng **góp vào việc chọn chỗ cắt**: khung bị đẩy quá lề dưới
    thân bài thì trang cắt ở mép trên của nó dù chữ quanh nó vẫn vừa — không
    thì ô form cao rơi ra ngoài trang. Khung vốn đã quá lề dưới từ trước (con
    dấu, chữ ký ở lề) không tính, không thì sửa một chữ cũng tràn trang. Chỗ
    cắt do khung gây ra mà rơi vào nửa trên một dòng chữ thì dời lên mép trên
    dòng ấy (vùng bấm của liên kết thấp hơn dòng chữ của nó).
    Các nút của một **nhóm radio** xét chung MỘT khung (`riderFrames`, khoá
    nhóm lấy từ `radioGroupKey()`): chỗ cắt không rơi vào giữa nhóm, cả nhóm
    sang cùng một trang. Xẻ nhóm ra hai tệp là hỏng dữ liệu chứ không chỉ đổi
    tên: pdf-lib ghi lựa chọn đang đánh dấu bằng THỨ TỰ nút trong `/Kids`, tỉa
    bớt nút là `/V` chỉ sang nút khác. Chỉ gộp nhóm radio — trường chữ lặp ở
    đầu và cuối trang mà gộp thì tràn một dòng là kéo gần cả trang sang trang
    mới. Khung đi kèm thuộc chân trang / cột nào cũng xét theo tâm (`riderPart`):
    ô form nhô lên khỏi dòng chân trang vài pt vẫn là của chân trang.
    Trang gốc + các trang tràn vào một `edit` duy nhất (`replacePage(id, [...])`)
    nên hoàn tác gỡ cả cụm. `ReflowPlan.zones` (lề, chân trang, cột) tính lúc
    mở ô gõ và đi theo yêu cầu — `planShift` không tính lại.
  - Trang hai cột còn một bẫy ở mép ngắt dòng: hàng bên kia khe cột trống đúng
    chỗ đang sửa thì không có gì chặn, chữ mới chạy tới hết tiêu đề trải hai
    cột → `planReflow` kẹp `right` về mép phải thật của cột (`columns.reach`).
  - Trang không có chữ ở cấp trang (bản scan + OCR, chữ nằm trong Form XObject)
    hoặc một mảnh chữ chạy dài quá khối → **lùi về phủ bề mặt** và thanh công cụ
    nói rõ "Chỉ che trên bề mặt". `probeReflow()` trả `null` là tín hiệu đó.
  - `HEAPU8` của PDFium phải đọc lại sau mỗi lần cấp phát — bộ nhớ WASM lớn lên
    là bản cũ bị tách rời, ghi vào không lỗi mà không tới đâu.
  - Kiểu `.d.ts` của gói tham chiếu `EmscriptenModule` (repo không cài
    `@types/emscripten`) → `services/pdfium.ts` khai `PdfiumRuntime` tối thiểu.
- **Gộp đối tượng trùng ngay trước khi lưu** (`services/pdf-dedupe.ts`): trang
  đã cắt / đã sửa chữ là tệp một trang riêng, mang theo bản phông và ảnh nó dùng
  chung với trang khác — tệp Word 555 KB xuất ra 952 KB sau MỘT lần sửa, gộp
  xong còn 508 KB (1000 trang: 16 ms). Chỉ gộp stream, từ điển phông và mảng /
  từ điển con **của phông**. Mảng `/Annots` rỗng của hai trang cũng "giống hệt
  nhau" — gộp là thêm ghi chú vào trang này hiện ở cả trang kia.
- **Thanh dấu luôn một hàng, cuộn ngang** (`overflow-x: scroll`, không phải
  `auto`): cho xuống dòng thì chọn Bút / Chữ làm thanh cao gấp đôi ở màn 1440 và
  cả trang nhảy ~48px; `auto` thì chính thanh cuộn hiện ra lại đẩy trang xuống.
  Playwright headless ẩn thanh cuộn — muốn đo đúng phải bỏ `--hide-scrollbars`.

## Trình duyệt cũ

pdf.js v6 (bản thường, không phải `legacy/`) gọi thẳng `Iterator`,
`Promise.withResolvers`, `Promise.try`, `URL.parse`, `AbortSignal.any`,
`Math.sumPrecise`, `Map.prototype.getOrInsertComputed`,
`Uint8Array.prototype.toHex` mà không kèm polyfill. Thiếu `Iterator` (Chrome
109 — bản cuối của Windows 7/8) thì chunk ném lỗi **ngay lúc nạp**; thiếu các
API còn lại thì nạp được nhưng vỡ giữa chừng, lúc người dùng đã thả tệp vào.

- `ToolRoutePage` hỏi `pdfEngineSupported()` (`hub/utils/browser-support.ts`)
  **trước khi vẽ** các màn trong `PDF_ENGINE_SCREENS` (`hub/config/tool-catalog.ts`
  — mọi màn của feature này đều kéo pdf.js qua import tĩnh, kể cả Ảnh → Văn
  bản và Scan ảnh → PDF). Thiếu thì hiện `ToolUnsupported` thay cho màn công cụ;
  công cụ ảnh, QR và tiện ích không bị chặn.
- Thêm màn PDF mới → thêm vào `PDF_ENGINE_SCREENS`. Nâng `pdfjs-dist` → soát lại
  danh sách API trong `browser-support.ts` (thừa là chặn oan, thiếu là vỡ giữa chừng).
- Ngoài Chuyện Nhỏ: OCR của CDE (`cde-ocr-run.ts`) và đọc CV ứng viên
  (`candidate-cv.ts`) nạp pdf.js bằng `import()`; nạp hỏng thì gửi nguyên tệp
  cho máy chủ tự bóc chữ.
- Chưa làm: cho công cụ PDF CHẠY trên trình duyệt cũ. Hướng đã cân nhắc là bản
  `pdfjs-dist/legacy` (có polyfill sẵn) + polyfill `ReadableStream` async
  iterator cho `getTextContent()` (Chrome 124).

## Giới hạn đã biết

- PDF → Word/Excel là dựng lại từ lớp chữ (best-effort): bố cục phức tạp lệch,
  dấu tay / số trang / watermark không đi theo, có thể lẫn chữ của layer đang ẩn.
- "Che chữ" và "Tìm & thay" vẫn chỉ phủ bề mặt — chữ gốc còn trong tệp (đã ghi
  rõ trên giao diện); muốn xoá hẳn thì dùng "Xoá thật". "Sửa chữ" cũng lùi về
  kiểu này ở trang scan / OCR.
- Sửa chữ viết lại trang:
  - Bấm vào chữ lấy **cả đoạn văn**; kéo chọn thì lấy đúng các dòng đã kéo (cách
    duy nhất để sửa riêng một dòng của đoạn). Đoạn căn đều hai bên thành căn trái.
  - Đoạn dò bằng hình học nên có lúc lấy thiếu: dòng trên chưa chạy hết bề
    ngang cột (danh sách dòng ngắn, địa chỉ), đoạn lẫn chữ đậm / nghiêng, ô cuối
    của bảng không viền → chỉ lấy dòng được bấm. Trang hai cột mà cột được bấm
    dưới 6 dòng, hoặc dưới 3 dòng có chữ bên phải, thì mép cột vẫn lấy theo cả
    trang → đoạn trong cột ấy chỉ lấy được một dòng. Lấy thừa: bảng không viền
    có cột chữ dày, mỗi ô một dòng dài, hàng cách hàng đúng bằng giãn dòng thì
    cả cột bị nối thành một đoạn (kéo chọn để sửa riêng một ô).
  - Chrome "In ra PDF" ghi **mỗi ký tự một vật chữ** (Word, LibreOffice, pdf-lib
    ghi theo dòng / theo đoạn chữ). Không vật nào đủ dài để "vắt ngang khe" nên
    đoạn trải hết bề ngang nằm dưới vùng hai cột không kết thúc được vùng ấy →
    trang không được nhận là hai cột, sửa cột này đẩy cả cột kia. Vì thế mẫu
    `hai-cot-ngan.pdf` / `bang-khong-vien.pdf` dựng tay bằng pdf-lib chứ không
    in từ Chrome.
  - Phần tràn sang **trang mới chèn ngay sau**, không dồn vào trang kế có sẵn:
    mỗi lần tràn thêm một trang (sửa tiếp trang ấy mà tràn thì lại thêm trang).
    Số trang in sẵn trong tệp không tự đổi, trang mới không có đầu / chân trang,
    bảng bị cắt đôi không lặp hàng tiêu đề. Ô form, ghi chú, dấu tay đi theo phần
    bị cắt và tự gây ra chỗ cắt khi bị đẩy quá lề dưới; trang cắt ở **mép trên
    của khung**, nên nhãn nằm phía TRÊN ô (ô ghi chú nhiều dòng) ở lại cuối
    trang cũ còn ô sang đầu trang mới, và một khung đánh dấu vẽ bao quanh mấy
    đoạn cuối trang chạm lề là kéo cả cụm ấy sang trang mới. Nhóm radio đi cả
    nhóm, trừ khi chính dòng đang sửa nằm GIỮA các nút của nhóm (sửa nhãn của
    lựa chọn thứ hai cho dài ra): nút phía trên ở lại, nút phía dưới tràn sang
    trang mới — nhóm thành hai trường, bản ở trang sau mang tên `_2` và lựa
    chọn đã đánh dấu có thể lệch. Trường KHÁC radio có nhiều ô (một trường chữ
    hiện ở hai chỗ) bị cắt giữa các ô cũng thành hai trường `_2`, giá trị giữ
    nguyên. Dòng cuối của form cách dòng trên xa hơn 1,5 lần giãn dòng và nằm
    trong 15% đáy trang bị coi là chân trang: nhãn của nó ở lại trang cũ dù ô
    đã theo nhóm sang trang mới. Lề dưới là lề SUY RA: trang có đầu trang sát mép thì thân bài
    được xuống sâu hơn lề thật trước khi sang trang.
  - Chân trang và cột bên cạnh dò bằng hình học của chính trang ấy. Dò hụt thì
    chúng bị đẩy như cũ: chân trang nằm sát thân bài, cột là danh sách có ký
    hiệu thụt treo rộng, cột căn phải / căn giữa, cột bên cạnh dưới 6 dòng,
    vùng hai cột có một cột thấp hơn 40% trang mà các đoạn hai bên tình cờ mở
    đầu ngang hàng. Dò nhầm: khối chữ ký / "Nơi nhận" đứng tách ở đáy trang bị
    coi là chân trang (không đi theo thân bài); bảng không viền có hai cột toàn
    chữ dày bị coi là hai cột (hàng lệch nhau) khi cả hai cột cao quá 40% trang, hoặc khi
    hàng cách hàng đúng bằng giãn dòng (không có gì để nhận ra chỗ sang hàng).
    Cột đang sửa dài quá vùng hai cột thì không chảy sang cột kế bên.
  - Viền bảng vẽ bằng nét stroke quanh cả ô (chưa gặp ở Word, Chrome,
    LibreOffice) không được kéo dài theo hàng — hở một đoạn.
  - Chưa thấy trước cảnh đẩy dòng lúc đang gõ — chỉ thấy sau khi lưu.
  - Mỗi lần sửa nhúng thêm một phông con (~15–20 KB).
- Ô form đã điền lưu cỡ chữ tự động vào DA của ô.
- qpdf chạy trên luồng chính — tệp mật khẩu rất lớn làm tab khựng lúc mở khoá.
- Trang chỉnh nghiêng mất form/annotation của trang đó (trang được nhúng lại
  thành Form XObject); trang ảnh chỉnh nghiêng / cắt được nén lại JPEG 0,92.
- Chỉ soi bản scan ở trang **không có lớp chữ** — xoay/cắt trang có chữ làm lệch lớp chữ.

## Không làm ở bản Free

- Word/Excel → PDF: cần LibreOffice phía máy chủ.
- Đo KPI sử dụng đầy đủ (telemetry: hoàn thành tác vụ, tỉ lệ quay lại…): chỉ có
  bộ đếm lượt mở công cụ (`erp_tools`), không có gì hơn.
- SEO thật cho từng công cụ: app là SPA, các trang `/doc-tools/<slug>` không có
  HTML dựng sẵn cho bot.

## Hiệu năng

Đo bằng Chrome headless 1440×900, tệp A4 có lớp chữ, cùng một kịch bản cho 500
và 1000 trang (nâng tạm trần trong bản làm việc để đo).

Bản production (`vite preview`), 01/10/2026:

| | 500 trang | 1000 trang | 500 trang, CPU chậm 4× | 1000 trang, CPU chậm 4× |
| --- | --- | --- | --- | --- |
| Trang đầu hiện | 1,5 s | 1,8 s | 3,2 s | 4,5 s |
| Chọn tất cả / xoay cả lưới | 0,25 / 0,19 s | 0,50 / 0,35 s | 1,4 / 1,0 s | **2,8 / 2,3 s** |
| Tìm một chữ có ở mọi trang | 2,7 s | 8,8 s | 15 s | **72 s** |
| Xuất PDF / Word | 0,7 / 3,6 s | 1,3 / 8,2 s | 3,3 / 22 s | 11 / 50 s |
| Bộ nhớ JS đỉnh | 276 MB | 497 MB | 216 MB | 399 MB |

**Giữ trần 500.** Ở 1000 trang trên máy yếu, mỗi cú bấm trên lưới khựng 2–3 s
và tìm kiếm tăng nhanh hơn số trang (gấp đôi trang → chậm gấp 3,3–4,7 lần):
`useTextSearch` đẩy kết quả lên sau mỗi 10 trang, mỗi lần đẩy là cả lưới N thẻ
render lại → tổng công việc ~N². Muốn nâng trần phải sửa hai chỗ trước: đẩy kết
quả tìm theo thời gian thay vì theo số trang, và ảo hoá lưới (chỉ dựng thẻ đang
trong tầm nhìn — hiện 1000 trang là ~19.000 nút DOM).

## Kiểm chứng

- `npm test` — logic thuần của feature nằm ở `utils/*.test.ts` và
  `services/*.test.ts` (phân tích bản scan, vùng xoá, gom tệp hàng loạt, slug…).
- Giao diện: `npm run build` + `npx eslint src/features/tools` +
  chạy thử ở ba theme × 360/768/1440, xuất thật rồi **nạp lại tệp đã xuất** để
  soi (đếm trang, tìm chữ, mở Word).

### Script kiểm thử tay (`scripts/doc-tools/`)

Không chạy trong CI. Điều khiển Chrome đã cài trên máy qua Playwright — repo
**không** cài Playwright; `lib/qa.mjs` tìm theo thứ tự `PLAYWRIGHT_DIR` →
`node_modules` của repo → cache của npx, nên chỉ cần chạy một lần
`npx -y playwright@1.62.0 --version`.

```bash
node scripts/doc-tools/make-fixtures.mjs          # sinh tệp mẫu (~50 s, ~20 MB, thư mục tạm)
node scripts/doc-tools/check-batch.mjs            # một script, light 1440
node scripts/doc-tools/matrix.mjs check-batch.mjs # 3 theme × 360/768/1440
CASE=1000 CPU=4 node scripts/doc-tools/measure-pages.mjs   # bảng Hiệu năng ở trên
```

Biến môi trường: `BASE` (mặc định `http://localhost:3000/doc-tools/chinh-sua-pdf`
— **trình chỉnh sửa** của nhánh công khai, không phải trang chọn; `lib/qa.mjs` suy
`HUB` (`/doc-tools`) và `APP_HUB` (`/tools`) từ đó), `THEME`,
`VIEW` (`1440x900`), `FIXTURES`, `QA_OUT` (ảnh chụp + tệp tải về), `SOFFICE`
(LibreOffice, chỉ `check-office` dùng để mở thử tệp Word). Mỗi script in một
khối JSON `checks` + `errors` (lỗi console) — đọc số liệu trong đó, script
**không** tự đánh trượt. `check-service-worker` cần bản production có SW:
`npm run build && npx vite preview` rồi `BASE=http://localhost:4173/erpcons/doc-tools/chinh-sua-pdf`.

Script chạy với tư cách **khách** trên nhánh công khai. Muốn soi trong khung app
thì gọi `mockSession(page)` (`lib/qa.mjs`) **rồi mở `APP_HUB`** — có phiên mà mở
`HUB` thì vẫn là khung khách. `mockSession` giả `/me` đã đăng nhập và trả 404 cho
mọi API khác — để chúng rơi xuống Drupal thật là ăn 401, app coi như hết phiên
và đẩy về `/login`.

| Script | Soi gì |
| --- | --- |
| `check-search` · `check-text-edit` · `check-ocr` | tìm chữ, sửa / che / thay chữ, OCR |
| `check-text-reflow` | sửa chữ viết lại trang: dòng danh sách, đoạn văn, ô bảng, viền bảng liền mạch, vùng cắt theo ô, trang hai cột + chân trang đứng yên, phần tràn sang trang mới + hoàn tác, trang scan; soi lại tệp đã xuất |
| `check-form-spill` | sửa chữ tràn trang trên trang có form: ô form sang trang mới cùng nhãn, bảng "Điền form" không lặp trường, giá trị điền trước / sau còn nguyên, tệp xuất không có `_2`; nhóm radio xếp dọc sang trang mới cả nhóm, còn nguyên lựa chọn |
| `check-column-zones` | vùng hai cột thấp (`hai-cot-ngan.pdf`): bấm lấy cả đoạn, sửa cột trái thì cột phải + chân trang đứng yên; bảng không viền ô nhiều dòng (`bang-khong-vien.pdf`): bấm lấy cả ô, sửa một ô thì hàng dưới đi cùng nhau ở cả hai cột |
| `check-markup` · `check-markup-snap` · `check-markup-rotate` · `check-textbox-resize` | đánh dấu, bám chữ, xoay theo trang, hộp chữ đổi cỡ |
| `check-image-pages` · `check-compress-annot` | khổ giấy trang ảnh, cắt trang, nén, dấu thành annotation |
| `check-office` | PDF → Word / Excel |
| `check-carryover` · `check-form-fill` · `check-password` | giữ form/link/đính kèm/layer khi ghép, điền form, PDF mật khẩu |
| `check-redaction` · `check-scan-cleanup` · `check-batch` | xoá thật, dọn bản scan, xuất từng tệp riêng |
| `check-limits` · `check-suggestions` · `check-tool-routes` · `check-layout-narrow` | trần tệp/điểm ảnh/huỷ xuất, gợi ý + mời đăng nhập của trình chỉnh sửa, trang chọn + đường dẫn từng công cụ + **hai nhánh** (khách không chờ `/me`, khách mở `/tools` về `/login`, khung app không dựng lại, đã đăng nhập mở link công khai), màn hẹp |
| `check-page-tools` | năm công cụ trên trang: tệp ra đúng thứ tự / góc xoay / số trang / dấu, và bài thử KHÔI PHỤC của Che thông tin (chữ, luồng nội dung gốc, số ảnh trên trang) |
| `check-flows` | bảy công cụ nhanh: điều kiện chạy, tệp bị từ chối, đổi thứ tự, huỷ OCR, bước soát chữ OCR (xác nhận nguyên giá trị), PDF mật khẩu, "Sửa tiếp"; tải tệp kết quả về rồi soi (số trang, tên trong .zip, chữ tìm được, khổ giấy). `FULL=1` thêm bước đã đăng nhập |
| `check-image-extra` | Ảnh hàng loạt (tên + kích thước từng ảnh trong .zip, ảnh chỉ đổi tên phải y hệt tệp gốc từng byte), Che & đóng dấu (vẽ / bỏ khung, **màu điểm ảnh dưới khung che trong tệp ra**, ngoài khung không đổi), Ảnh thẻ (khổ trang PDF theo mm, số ảnh nhúng, kích thước + mật độ DPI của tờ JPG, tỉ lệ ảnh thẻ đơn). `ONLY=batch,mark,photo` |
| `check-image-tools` | bốn công cụ ảnh + camera của "Scan ảnh → PDF": ảnh mẫu sinh bằng canvas ngay trong trang, camera là thiết bị giả của Chrome; tải kết quả về rồi soi (chữ ký byte, kích thước, màu điểm ảnh sau xoay / cắt / chỉnh sáng, tên trong .zip, số trang PDF, luồng camera đã tắt). `ONLY=convert,compress,crop,measure,camera` để chạy riêng |
| `check-sign-compare` | Chèn chữ ký (vẽ nét, đặt / kéo / bỏ chữ ký, đặt sát góc vẫn nằm trong trang, đổi nguồn; tệp ra: đúng trang có ảnh, MỘT object ảnh cho mọi chỗ đặt, mở lại tệp ra để nhìn), So sánh tài liệu (báo cáo chỉ đúng 2 dòng đã đổi của `hop-dong-v2.pdf`, tệp tải về trùng nội dung trên màn, hai bản y hệt, tệp không có chữ phải ra lỗi). `ONLY=sign,compare` |
| `check-app-branch` | Phiên đã đăng nhập giả (`mockSession` trả `AccountState` của backend Chuyện Nhỏ): mở trang chọn `/cong-cu` rồi mọi công cụ (slug đọc từ danh mục trong mã nguồn), soi từng màn có dựng xong, có ở đúng đường dẫn, có tràn ngang, có lỗi console; chụp trang chọn + 4 màn. Không chạy công cụ |
| `check-money-date` | Tính tiền (10 phép, thuế suất bỏ trống thì chưa ra kết quả, số sai / chia cho 0 / margin 100%), Tính ngày (hai chế độ, đếm ngược, ngày làm việc), mã QR danh thiếp tạo rồi **đọc ngược lại** đúng chuỗi vCard. `ONLY=money,date,vcard` |
| `check-utility-tools` | tám tiện ích không cần tệp: tạo mã QR ở cả sáu màu rồi **đọc ngược lại** bằng chính công cụ đọc (kèm EAN-13, Wi-Fi, ảnh chụp xa, ảnh không có mã, tệp giả ảnh), camera quét bằng thiết bị giả của Chrome (tệp `.y4m` dựng từ mã vừa tải) + luồng đã tắt, phép tính / đổi đơn vị / đếm chữ / đổi mã màu / mã ngẫu nhiên không trùng, ghi chú còn sau F5 và chịu được dữ liệu hỏng, một màn trong khung app. `ONLY=qr-create,qr-read,camera,calc,unit,count,color,random,note` để chạy riêng |
| `measure-pages` | thời gian + bộ nhớ theo số trang (`CASE`, `CPU`) |
| `check-exif` | EXIF / GPS của ảnh nguồn có đi theo vào tệp ra không: JPEG mang toạ độ GPS + chuỗi đánh dấu qua Scan ảnh → PDF, trình chỉnh sửa, chuyển đổi / nén / cắt ảnh, Nén PDF, nguồn PNG mang `eXIf`; soi **byte** tệp tải về. `ONLY=scan,rotated,editor,convert,compress,crop,pdf,png` |
| `check-network` | Network QA cả 21 công cụ: chạy thật với tệp / nội dung mang chuỗi đánh dấu, soi mọi request (kể cả của worker) — lệnh ghi ngoài bộ đếm lượt mở, request ra origin khác, thân request lớn, chuỗi đánh dấu trên đường truyền. Đọc `summary` trước. `ONLY=<slug>,…`; `SELFTEST=1` tự bắn request bẩn để chắc bộ soi không mù (mọi công cụ phải bị gắn cờ) |
| `golden` | **Cổng hồi quy** — khác các script trên, script này TỰ ĐÁNH TRƯỢT. Chạy thật 21 công cụ với tệp mẫu + tuỳ chọn cố định, so chữ ký nội dung của kết quả (số trang, chữ, kích thước + màu ảnh, tên trong .zip, chuỗi kết quả) với `golden/baseline.json`. Hai công cụ OCR dừng ở bước soát chữ — script xác nhận nguyên giá trị máy đọc rồi mới xuất. Mã thoát 1 = lệch baseline, 2 = không so được (công cụ không chạy xong, tệp mẫu đã đổi). Thay đổi có chủ ý thì `UPDATE=1` rồi commit baseline; `ONLY=<slug>,…` chạy / ghi riêng từng mục. Sửa engine xong phải chạy lại script này |
| `bench-limits` | Benchmark cho Limit Matrix: tăng dần cỡ đầu vào ở bảy công cụ nặng (số ảnh, điểm ảnh, MB, số trang), mỗi ca một Chrome mới, đo thời gian + bộ nhớ riêng của tiến trình Chrome (chỉ Windows). Tự sinh tệp đo vào `FIXTURES/bench`. `QUICK=1` chỉ cỡ nhỏ nhất, `ONLY=<slug>`, `MATCH=<biểu thức>` lọc theo nhãn ca, `CPU=4` làm chậm luồng chính 4 lần (worker không chậm theo). Không đánh trượt — ca hỏng là dữ liệu. Kết quả ở `doc-tools-registry.md` mục 7.5 |
