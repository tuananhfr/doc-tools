# Audit S0 — Chuyện Nhỏ (12/10/2026)

Đối chiếu spec v3 §13. Bản đồ: `menu-consolidation-map.csv`, `implementation-map.csv`.
Số đo baseline: `baseline-metrics.json` (ảnh ở `qa-output/s0-baseline-2026-10-12/`, không vào git).

## Chụp lại

`npm run dev` rồi `QA_OUT=qa-output OUT_NAME=s0-baseline-<ngày> node scripts/doc-tools/capture-baseline.mjs`.
Theme đặt qua localStorage `erpcons.app`; mọi `/api/v1/**` bị chặn bằng phản hồi giả. 16 trang × 4 bề rộng
(360, 390, 768, 1366) × 2 theme = 128 lần chụp — lần chụp 12/10: 0 lỗi, 0 lệnh gọi thẳng sang cổng
backend `:3003`, theme khớp ở cả 128. "0 lệnh gọi thẳng" chỉ nói về trình duyệt: `/api/v1` cùng origin
đã bị mock nên không thể lọt, còn fetch phía server của Next thì script không thấy (16 trang đã chụp
không trang nào có — chỉ `/gioi-thieu/[site]` gọi backend từ server).

## Tóm tắt số đo (từ baseline-metrics.json)

| Bề rộng | Chữ thân (px) | Trang tràn ngang | Vùng chạm < 44px (trung bình/trang) |
| --- | --- | --- | --- |
| 360 | 14 | — | 5.4 |
| 390 | 14 | — | 5.4 |
| 768 | 14 | — | 13.8 |
| 1366 | 14 | — | 14.0 |

- Chữ thân 14px ở mọi trang, mọi bề rộng — dưới mức 16px đã chốt (Q6).
- Vùng chạm nhỏ hay gặp nhất ở ≤390px: logo `a.cn-brand` (cao 31–32px), `a.erp-tool-crumb__back` (85×40),
  link trong dòng chữ, ô nhập cao 38px, `form-check-input` 16px, `button.cn-search-submit`, nút đổi ngôn
  ngữ 32px.
- Contrast **chưa đo** ở S0 — để `check-a11y.mjs` của WP2a đo trước khi sửa và dùng làm baseline.

## Số bước 6 journey (390×844, khách)

Một "bước" = một lần chạm/nhấp/gõ-xong-một-ô/chọn-tệp, bắt đầu ở `/`. Đo bằng Playwright điều khiển
Chrome ở viewport 390×844 (không phải DevTools tay), backend không chạy.

| Journey | Số bước | Làm được? | Ghi chú |
| --- | --- | --- | --- |
| CN-001 | — | **Không** | Trang chủ mobile không có ô tìm — phải qua "Mở công cụ" → `/cong-cu`. "đọc truyện pdf cho bà nghe" → 0 kết quả; "nghe pdf", "đọc truyện" → 0; "đọc to" → 3, "đọc văn bản" → 2. Tìm thấy rồi thì `/doc-to-van-ban` cũng chỉ nhận chữ dán vào, không mở được PDF. |
| CN-005 | ~19 | Có | `/ghep-anh` chế độ "Nhiều bố cục, logo & ZIP". Chọn 8 ảnh một lần, xem trước cập nhật ngay, không phải tải lại ảnh. Trên mobile mỗi lần thử bố cục tốn 3 bước (tab Nhập → chọn → tab Xem trước). Xuất `thiet-ke.zip` (7,7 MB); "Làm lại" giữ bố cục + xem trước. |
| CN-006 | ~10 | Có | `/tao-cv`: đổi mẫu 3 lần vẫn giữ nội dung đã nhập; xem trước nằm ở tab "Xem trước" trên mobile. Tải về `Nguyễn Văn An.pdf`. |
| CN-007 | ~12 | Có | `/anh-the` → "Ghép nhiều ảnh và kích cỡ". Mỗi ảnh chỉ một cỡ nên phải thêm cùng ảnh hai lần (người dùng khó tự đoán). Tờ A4 `Tờ ảnh hỗn hợp.pdf`: đo trong content stream 2 ảnh 40×60 mm + 2 ảnh 30×40 mm — đúng kích thước in. |
| CN-014 | 0 | Một phần | `/doc-tools/nen-pdf` → `/nen-pdf` đúng; `?tool=merge` → `/ghep-pdf` đúng. `?tool=compress` và `?tool=compress-pdf` rơi về trang chủ — `LEGACY_TOOL_QUERY` chỉ có merge, split, image-to-pdf, pdf-to-word. |
| CN-015 | — | Chưa đo hết | `/tarot`: không có Pro, đăng nhập hay CTA trả phí; có câu miễn trừ ("chỉ mang tính tham khảo và giải trí…"). Bước rút bài + luận giải cần backend + DB nên **chưa đo** (không chạy backend để khỏi ghi vào DB dev). |

## Script QA lỗi thời

Các script `scripts/doc-tools/check-*.mjs` được viết cho giao diện ERPCons cũ (trang chọn công cụ
`.erp-tools-grid` ở gốc nhánh, nút `.erp-tools-hero__trials`, khung app `.erp-shell` / `.erp-sider__item`).
`lib/qa.mjs` đã trỏ sang cổng 3002 và bỏ nhánh app (`APP_HUB` chỉ đặt khi chạy với ERPCons), nhưng phần
khách vẫn dùng selector cũ:

- **Đã chạy, đỏ:** `check-tool-routes.mjs` — hết giờ chờ ngay bước đầu (`open('')`, dòng 35): trang `/`
  bây giờ là trang giới thiệu, không còn `.erp-tools-grid`. `HeroTrialActions` (chứa
  `.erp-tools-hero__trials`) không còn được component nào dùng.
- **Chưa chạy, nghi cùng lỗi** (lấy `.erp-tools-grid` / `.erp-tool-card` ở gốc site làm mốc):
  `check-exif`, `check-free-search-ocr`, `check-independent-search`,
  `check-ocr-states`, `check-ocr-v2`, `check-p0-journeys`, `check-utility-tools`, `check-client-states`,
  `check-mobile-remediation`, `bench-ocr`.
- **Chỉ chạy khi có `APP_HUB` (ERPCons):** `check-app-branch` (không có thì thoát 0 ngay), bước đã đăng
  nhập của `check-tool-routes`, `check-flows` (`FULL=1`), `check-utility-tools`, `check-suggestions`
  (`FULL=1`). Chạy với ERPCons thì vẫn dùng selector khung app cũ (`.erp-shell`, `.erp-sider__item`).

Chuyển cho WP1 (sau khi gộp menu/hub thì sửa selector một lượt) và WP7 (gate phát hành).

## Quyết định đã chốt (12/10/2026)

Q1 TOOL-REPAIR-PLAN: không gộp, luồng riêng · Q2 đọc link: có, sau cờ, sau WP4-A · Q3 hub + tab giữ slug ·
Q4 thêm DEDUPED/TRIAGED/RELEASED · Q5 module sources + sourceId tuỳ chọn · Q6 chữ 16px + pref chữ lớn ·
Q7 giữ Pro, không CTA Pro ở giải trí · Q8 13 locale chép en.

## Sau WP2a (token & a11y nền)

`check-a11y.mjs` trên 16 trang + một trạng thái có kết quả (`/nen-anh`), 360/390/430 × light/dark/field:
trước WP2a 1.831 lỗi P0 (chữ thân 14px ở 96 lượt đo — theme Field vốn đã 16px, 1.566 vùng chạm < 44px,
168 chữ dưới AA, nút Tải ra ngoài màn hình khi chữ 200%); sau WP2a 0 P0, cả ở chế độ "Chữ lớn". Kết quả ở
`qa-output/wp2a-before/` và `qa-output/wp2a-after*/` (không vào git). `capture-baseline` sau WP2a:
`qa-output/wp2a-2026-10-12/metrics.json` — chữ thân 14 → 16px, không trang nào tràn ngang, vùng chạm
< 44px trung bình/trang 5,38 → 0,44 (360/390), 13,75 → 3,44 (768), 14 → 4 (1366; còn lại là link trong
câu và ô tick mà số đo thô vẫn đếm).

## Ký duyệt

| Vai | Người | Ngày | Kết luận |
| --- | --- | --- | --- |
| CTO | | | |
| BA | | | |
