# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Đọc `README.md` trước; đọc `docs/api.md` trước khi đổi bất kỳ hợp đồng API nào. Đây là
app **độc lập về code** (NestJS 12 + Fastify + MySQL/InnoDB, database riêng `doc_tools`)
phục vụ bản Free của Chuyện Nhỏ; nằm chung repo Git `doc-tools` với frontend (`../frontend`),
nối qua HTTP — không workspace, không `file:` dependency. **Tuyệt đối không trỏ app này vào database ERPCons.**

## Lệnh

```bash
npm ci                 # Node 24+, npm 11.11
cp .env.example .env   # điền DB_* và VISIT_HASH_SECRET
npm run dev            # build MỘT lần rồi node --watch dist/main.js — cổng 3003
npm run build          # tsc -> dist/
npm test               # build + node --test tests/*.test.cjs, MySQL THẬT
npm run lint           # = tsc --noEmit
npm run build && node --test tests/rules.test.cjs   # một file test
```

- **`npm run dev` không tự biên dịch lại** khi sửa `.ts` — nó chỉ theo dõi `dist/`. Sửa
  xong phải `npm run build` (ở terminal khác) để thấy thay đổi.
- Test là `.cjs`, `require('../dist/...')` — chạy trên bản build, không phải `src/`. Test
  nối MySQL theo `.env`, tự tạo dữ liệu `qa-*` rồi tự dọn; không có MySQL là test fail.
- `configuration()` ném lỗi lúc khởi động nếu `VISIT_HASH_SECRET` trống hoặc
  `DB_PASSWORD` **chưa khai** (được phép là chuỗi rỗng, nhưng phải có dòng đó).

CLI người vận hành (chạy sau khi build, trên máy chủ tin cậy):

```bash
npm run rules -- stage package.json <operator>
npm run rules -- activate <kind>:<digest> <operator>
npm run rules -- rollback <kind>:<digest> <operator>
npm run contributions -- show <uuid>
npm run contributions -- verify <uuid> <reviewer> <note>   # rồi approve / publish
```

## Kiến trúc

`src/main.ts` chỉ ghép app (prefix `api/v1`, `bodyParser: false`). Ba module, mỗi module
chia `controller` / `service` / `repository` (SQL thô qua `mysql2`, không ORM):

| Module | Đường dẫn | Việc |
| --- | --- | --- |
| `tools` | `POST /tools/visits` · `GET /tools/stats` | Bộ đếm lượt mở công cụ |
| `rules` | `GET /rules/:kind` | Trả gói quy tắc đang kích hoạt, còn hiệu lực, xác minh được chữ ký |
| `contributions` | `POST /contributions` · `GET /contributions/receipt/:code` · `POST /contributions/receipt/:code/sources` · `GET /contributions/ideas` | Nhận đề xuất ẩn danh, tra trạng thái theo mã biên nhận, ý tưởng đã duyệt |

`src/cli/` là đường ghi DUY NHẤT cho gói quy tắc và việc duyệt đóng góp — không có
endpoint ghi công khai nào cho hai thứ đó.

### Bẫy

- **Không có migration.** `DatabaseService.onModuleInit` chạy `src/database/schema.ts`,
  toàn `CREATE TABLE IF NOT EXISTS`. Sửa cột ở đó **không** đổi bảng trên DB đã tồn tại —
  phải tự viết `ALTER` và tính đường cho môi trường đang chạy.
- **Parser body tự viết** (`config/http-adapter.ts`): nhận mọi content-type, JSON lỗi
  thành `null` thay vì 400 ở tầng parser — bắt chước Drupal cũ. Controller tự kiểm và trả
  `{ok:false, message}`.
- **Trần body toàn cục 1 KiB.** Route cần hơn phải khai `@RouteConfig({ bodyLimit })`
  (contributions 128 KiB, bổ sung nguồn 22 KiB).
- `trustProxy: 'loopback'`: IP thật chỉ lấy từ `X-Forwarded-For` khi proxy nằm trên
  loopback; app mặc định chỉ bind `127.0.0.1`.
- Visit vượt trần 120/giờ/IP vẫn trả `{ok:true}` (chỉ không cộng). Contributions vượt trần
  5/giờ/IP thì trả 429, trùng trả 409 `DUPLICATE_CONTRIBUTION`.
- IP không bao giờ lưu thô: HMAC với `VISIT_HASH_SECRET`, có hạn. Mã biên nhận chỉ lưu
  SHA-256. Endpoint trạng thái không trả nội dung đề xuất hay danh tính người duyệt.

## Luật nghiệp vụ không được phá

- Envelope phẳng `{ok, ...}` và `Cache-Control: no-store` trên các endpoint công khai.
- Gói quy tắc: hàng trong `rule_packages` bất biến, mọi stage / activate / rollback ghi
  `rule_audit`. Chữ ký Ed25519 tính trên JSON bỏ `signature`, khoá object sắp theo chữ cái
  ở mọi cấp. Thiếu `RULE_SIGNING_PUBLIC_KEY_PEM` → `GET /rules/:kind` trả 503. Khoá riêng
  nằm ngoài repo.
- Duyệt đóng góp: reviewer / approver / publisher là ba người khác nhau. Publish dữ liệu
  quy tắc cần nguồn, ghi chú xác minh và gói ký đã stage; kiểm chữ ký + ngày hiệu lực,
  kích hoạt gói và ghi audit trong MỘT transaction. Ý tưởng (`domain=ideas`) không cần
  nguồn/digest, chỉ hiện công khai sau khi publish.
- Không xuất bản dữ liệu pháp lý / giá từ archive khi chưa có gói ký đã xác minh độc lập.
  Nội dung AI hoặc người dùng gửi không tự thành dữ liệu chính thức.
- Danh tính operator hiện là tham số dòng lệnh; adapter định danh L3 (ERPCons/Tekshot)
  chưa nối.

Giữ tiếng Việt UTF-8 không BOM. `.env`, `dist/`, `node_modules/` không vào Git. Không
commit / push khi chưa được yêu cầu rõ ràng.
