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
npm test               # build + node --test --test-concurrency=1 tests/*.test.cjs, MySQL THẬT
npm run lint           # = tsc --noEmit
npm run build && node --test tests/rules.test.cjs   # một file test
```

- **`npm run dev` không tự biên dịch lại** khi sửa `.ts` — nó chỉ theo dõi `dist/`. Sửa
  xong phải `npm run build` (ở terminal khác) để thấy thay đổi.
- Test là `.cjs`, `require('../dist/...')` — chạy trên bản build, không phải `src/`. Test
  nối MySQL theo `.env`, tự tạo dữ liệu `qa-*` rồi tự dọn; không có MySQL là test fail.
  Các file test chạy **tuần tự** (`--test-concurrency=1`): `app_settings` là trạng thái
  chung của cả DB, file này đổi trần đề xuất thì file kia chạy song song sẽ vỡ ngẫu nhiên.
- `configuration()` ném lỗi lúc khởi động nếu `VISIT_HASH_SECRET` trống hoặc
  `DB_PASSWORD` **chưa khai** (được phép là chuỗi rỗng, nhưng phải có dòng đó).

CLI người vận hành (chạy sau khi build, trên máy chủ tin cậy):

```bash
npm run rules -- keygen <thư mục ngoài repo>           # in sẵn dòng .env cho backend + frontend
npm run rules -- sign <spec.json> <private.pem> <out.json>   # spec: data | dataFile | wardsCsv
npm run rules -- check <package.json>                  # chữ ký, hạn, kiểm theo loại, so với gói đang hiệu lực
npm run rules -- list <kind>
npm run rules -- stage <package.json> <operator>
npm run rules -- activate <kind>:<digest> <operator>   # gói ngày tương lai = lên lịch
npm run rules -- rollback <kind>:<digest> <operator>   # = rút gói, gói trước tự hiệu lực lại
npm run contributions -- show <uuid>
npm run contributions -- verify <uuid> <reviewer> <note>   # rồi approve / publish
npm run accounts -- grant-pro <email> <YYYY-MM-DD> <operator> [note]   # hết NGÀY đó giờ VN; revoke-pro / show / list-pro
npm run accounts -- grant-role <email> <owner|admin|reviewer> <operator>   # tạo chủ hệ thống đầu tiên; revoke-role / list-roles
npm run mail -- dkim-keygen <thư mục ngoài repo> [selector]   # in sẵn .env + bản ghi DNS SPF/DKIM/DMARC
npm run mail -- test <email>                           # gửi thử qua MAIL_TRANSPORT đang đặt
```

## Kiến trúc

Optional `/api/v1/tools/quality` accepts only fixed aggregate event/tool dimensions; it has no public report endpoint. `QualityRepository` stores daily counters and short-lived daily rotating HMAC hourly rate-limit buckets in two dedicated tables. `cli/quality` exports reports for trusted operators. No raw queries, documents, corrections or user tracking identifiers are accepted.

`src/main.ts` chỉ ghép app (prefix `api/v1`, `bodyParser: false`). Mỗi module
chia `controller` / `service` / `repository` (SQL thô qua `mysql2`, không ORM):

| Module | Đường dẫn | Việc |
| --- | --- | --- |
| `tools` | `POST /tools/visits` · `GET /tools/stats` | Bộ đếm lượt mở công cụ |
| `rules` | `GET /rules/:kind` | `{ok, package, upcoming}`: gói đang hiệu lực + gói sắp hiệu lực gần nhất, đã xác minh chữ ký |
| `contributions` | `POST /contributions` · `GET /contributions/receipt/:code` · `POST /contributions/receipt/:code/sources` · `GET /contributions/ideas` · `GET /me/contributions` · `POST /me/contributions/:id/evidence` | Nhận đề xuất (khách hoặc có tài khoản), tra trạng thái theo mã biên nhận, "Đề xuất của tôi" + bổ sung nguồn, ý tưởng đã duyệt |
| `auth` | `POST /auth/otp/{request,verify}` · `POST /auth/logout` | Đăng nhập email + mã 6 số, không mật khẩu |
| `accounts` | `GET`/`PATCH /me` | Người dùng + gói Pro + danh sách capability |
| `session` · `mail` | — | Phiên cookie `cn_session` + `TrustedWriteGuard` (CSRF) · hàng đợi `mail_outbox` + transport `direct`/`smtp`/`log` |
| `admin` | `/admin/*` (bảng đầy đủ ở `docs/api.md`) | Khu quản trị: người dùng, Pro, duyệt đề xuất, email, thống kê công cụ, cài đặt, phân quyền, nhật ký |
| `roles` · `settings` | — | Vai trò `owner`/`admin`/`reviewer` → permission (`roles/roles.ts`) · công tắc vận hành `app_settings` (`@Global`, cache 30 s) |
| `ai` | `/ai/{provider-types,setup,provider,provider/verify,session}` · `/admin/ai/*` | Trợ lý AI bản Pro: khoá AI của từng người thành provider + agent `cn-<userId>` trên GoClaw dùng chung; trình duyệt cầm vé nối WS thẳng tới GoClaw |
| `cloud` | `/me/saved` · `/me/saved/bookmarks/:toolId` | Kết quả đã lưu + công cụ yêu thích của tài khoản Pro (bảng `saved_items`); lịch sử kiểm nguồn ở `GET /ai/history` (module `ai`) |
| `mcp` | `GET /mcp/sse` · `POST /mcp/messages` | Máy chủ MCP (SSE, viết tay) cho agent: `cn_find_tools` / `cn_tool_guide` / `cn_open_tool`, đọc `data/tool-catalog.json` |

Bản Pro theo spec `../docs/pro/pro-spec.md` (bậc Khách / Tài khoản / Pro). Code kiểm
**capability** (`accounts/capabilities.ts`), không kiểm tên bậc. Pro cấp bằng CLI hoặc
khu quản trị (`plans.manage`).

Gói quy tắc chỉ ký / stage / kích hoạt bằng `src/cli/`. Duyệt đóng góp đi được cả CLI lẫn
khu quản trị — cùng luật ba người, cùng `assertPublishablePackage()` (`contributions/publish-check.ts`).

Khu quản trị không có đăng nhập riêng: tài khoản có dòng trong `user_roles` đăng nhập bằng
mã email như mọi người, phiên chỉ sống 12 giờ (`STAFF_SESSION_SECONDS`). Mọi route
`/admin/*` qua `@Staff(permission)` (`admin/admin.guard.ts`) và **đòi header tin cậy cả
với GET** — để trang lạ không đọc được dữ liệu quản trị bằng cookie. Mọi lệnh ghi phải
`AdminAuditRepository.record()`.

### Bẫy

- **Không có migration.** `DatabaseService.onModuleInit` chạy `src/database/schema.ts`,
  toàn `CREATE TABLE IF NOT EXISTS`. Sửa cột ở đó **không** đổi bảng trên DB đã tồn tại —
  phải tự viết `ALTER` và tính đường cho môi trường đang chạy. Chuyển dữ liệu thì viết
  hàm riêng ở `database/migrations.ts` (gọi sau SCHEMA), đừng nhét `INSERT … SELECT` vào
  SCHEMA: server và CLI khởi động cùng lúc sẽ deadlock.
- **User MySQL của app không có `ALTER`/`DROP`** (chỉ `SELECT, INSERT, UPDATE, DELETE, CREATE,
  INDEX`). `ALTER` lúc khởi động sẽ làm server sập. Cần thêm dữ liệu cho bảng cũ thì dựng
  **bảng phụ** (như `contribution_submitters` cho người gửi đề xuất), không thêm cột.
- **Parser body tự viết** (`config/http-adapter.ts`): nhận mọi content-type, JSON lỗi
  thành `null` thay vì 400 ở tầng parser — bắt chước Drupal cũ. Controller tự kiểm và trả
  `{ok:false, message}`.
- **Trần body toàn cục 1 KiB.** Route cần hơn phải khai `@RouteConfig({ bodyLimit })`
  (contributions 128 KiB, bổ sung nguồn 22 KiB, ảnh chat 10 MiB). Nest cất giá trị đó vào
  `config` — chỗ Fastify không đọc; hook `onRoute` trong `http-adapter.ts` chuyển nó sang
  `route.bodyLimit`. Thiếu hook là mọi route vẫn kẹt 1 KiB (đề xuất > 1 KiB từng ăn 413).
  Test `contributions.test.cjs` canh việc này.
- `trustProxy: 'loopback'`: IP thật chỉ lấy từ `X-Forwarded-For` khi proxy nằm trên
  loopback; app mặc định chỉ bind `127.0.0.1`.
- Visit vượt trần 120/giờ/IP vẫn trả `{ok:true}` (chỉ không cộng). Contributions vượt trần
  (mặc định 5/giờ/IP khách, 10/giờ/tài khoản — đổi được ở `app_settings`, không còn là hằng
  số) thì trả 429, trùng trả 409 `DUPLICATE_CONTRIBUTION`.
- **`app_settings` chỉ giữ giá trị không bí mật.** Bí mật (SMTP, DKIM, khoá ký, token GoClaw)
  ở `.env`; trang quản trị chỉ báo đã đặt / chưa (`admin/system-status.ts`) — đừng trả giá trị.
  Thêm cài đặt = một mục trong `settings/settings.definitions.ts` (kiểu + khoảng + nhãn tiếng Việt).
- `auth.signupOpen = false` kiểm SAU khi xác nhận mã (`SIGNUP_CLOSED`), nên không lộ email
  nào đã có tài khoản. Xoá tài khoản đi qua `AccountDeletionService` — module mới giữ dữ liệu
  theo người dùng phải `addCleanup()` vào đó, không thì dữ liệu mồ côi.
- Số lượt mở theo ngày (`tool_visit_days`) chỉ bắt đầu đếm từ khi bảng được tạo; tổng
  cộng dồn vẫn ở `tool_visits`.
- `POST /contributions` **không** gắn `TrustedWriteGuard` mà dùng `isTrustedWrite()`: thiếu
  header thì cookie bị lờ đi và đề xuất thành của khách. Cố ý: chặn cứng sẽ làm bundle cũ
  trong cache SW lỗi 403; gắn người gửi chỉ nhờ cookie là CSRF.
- IP không bao giờ lưu thô: HMAC với `VISIT_HASH_SECRET`, có hạn. Mã biên nhận chỉ lưu
  SHA-256. Endpoint trạng thái không trả nội dung đề xuất hay danh tính người duyệt.
- **Route ghi có cookie phải gắn `TrustedWriteGuard`** (đòi header `X-CN-Request: 1` + `Origin`
  trong `SITE_ORIGINS`). Cookie SameSite=Lax không chặn được subdomain cùng site; thiếu guard
  là CSRF. `SITE_ORIGINS` rỗng = nhận mọi origin — chỉ để dev.
- `GET /me` của khách trả **200 `user:null`**, không 401 — trang tĩnh gọi nó mỗi lần mở.
- **Mã OTP nằm thô trong `mail_outbox.payload` cho tới khi gửi xong** (rồi bị thay bằng `{}`);
  thư OTP quá hạn bị bỏ, không gửi muộn. `MAIL_TRANSPORT` mặc định `log` = in mã ra console,
  không gửi gì — production phải đặt `direct`/`smtp`.
- `direct` gửi thẳng cổng 25 tới MX người nhận: cần SPF + DKIM + PTR + cổng 25 mở, thiếu một thứ
  là Gmail/Outlook vứt vào Spam hoặc từ chối. Máy dev nhà mạng thường chặn cổng 25. STARTTLS
  luôn kiểm chứng chứng chỉ (MX chứng chỉ sai thì sang MX kế tiếp, không tin bừa).
- **GoClaw dùng chung, lỗi thứ tự là lộ khoá của khách.** Agent có provider bị mất / tắt /
  thiếu key sẽ chạy bằng một provider **ngẫu nhiên** của tenant. Nên: tắt agent TRƯỚC khi đụng
  provider, chỉ bật agent sau khi verify xong (`ai.service.ts`); `POST /ai/session` kiểm lại
  GoClaw mỗi lần đúc vé, lệch là tắt agent + 409 `AI_NOT_READY`. Test `ai.test.cjs` khẳng định
  đúng thứ tự gọi — đừng đảo.
- Provider được tạo `enabled: true` ngay lúc lưu vì `/verify` của GoClaw chỉ chạy với provider
  đã đăng ký; verify hỏng thì tắt lại. `background.provider` của GoClaw để trống cũng là
  "chọn ngẫu nhiên" — app chỉ báo (`npm run ai -- status`, trang admin), không tự sửa.
- Token MCP (`X-CN-MCP-Token`) đổi mỗi lần verify thành công, thu hồi khi admin khoá / xoá
  tài khoản. GoClaw chặn MCP ở host nội bộ trừ khi có trong `GOCLAW_MCP_ALLOW_PRIVATE_HOSTS`
  (env của GoClaw, không phải của app). Đổi chỉ dẫn agent (`agent/*.md`) hay `TOOLS_CONFIG`
  thì tăng `PROMPT_VERSION` (đang là 3) rồi `npm run ai -- sync-agents` — agent cũ không tự đổi.
- **Đính kèm chat: chỉ ảnh đi qua backend** (`ai-uploads.*`, kiểu nhận bằng magic bytes ở
  `upload-types.ts`). Link một lần, 5 phút, chỉ IP GoClaw tải được. Trình duyệt đưa link vào
  `chat.send` **không kèm `filename`**: GoClaw đặt tên bản sao `<uuid>.<ext>` và vault bỏ qua
  tên kiểu đó. Có tên là vault tóm tắt + embed tệp bằng provider **nền của tenant** (khoá của
  ERPCons, không phải của thành viên). Tệp chữ ghép thẳng vào tin nhắn ở trình duyệt.
  `read_image`/`read_audio`/`read_document`/`read_video` bị deny trong `TOOLS_CONFIG` vì chúng
  chọn provider theo tên trên toàn tenant. Trần 10 MiB là trần tải URL của GoClaw (cắt im lặng).
- **Chưa chặn được (cần quyết, chưa vá):** GoClaw tóm tắt MỌI lượt chat đã xong
  (`consolidation/episodic_worker.go`) và mọi tệp `write_file` ghi ra (vault enrich) bằng
  provider nền của tenant — nội dung chat của thành viên đi qua khoá ERPCons. Muốn tách hẳn
  phải vá GoClaw bỏ qua agent `cn-` hoặc dựng GoClaw riêng. Nếu tenant cấu hình chuỗi
  `read_image`, GoClaw không gửi ảnh thẳng cho model nữa → agent `cn-` (bị deny read_image)
  không thấy ảnh; kiểm trên GoClaw thật.
- Kiểm nguồn: agent chỉ được **soạn nháp** (`cn_create_contribution_draft` → bảng
  `contribution_drafts`), không có tool nào gửi đề xuất. Người dùng chọn dòng rồi gửi qua
  `/me/contribution-drafts/:id/submit`; nháp bị "claim" trước rồi mới gọi
  `ContributionsService.submit` với chính id đó, lỗi thì nhả claim — đừng đảo thứ tự, gửi
  hai lần song song sẽ ra hai đề xuất. `toolId` của đề xuất / nháp là **slug** công cụ
  (`tien-dien`), không phải id catalog (`electricity`).
- Tool MCP cần dịch vụ khác (quy tắc, nháp) nằm ở `mcp-tools.service.ts`; tool chỉ đọc
  catalog nằm ở `mcp-tools.ts` (`callCatalogTool`). Lỗi kho quy tắc phải trả câu bảo agent
  đừng đoán số, không ném lỗi JSON-RPC.
- **Mục đã lưu (`cloud`): đọc + xoá chỉ cần phiên, lưu / sửa / gắn sao mới cần Pro** — hết Pro
  là chỉ-đọc chứ không mất dữ liệu; kiểm Pro ở MỖI request, đừng cache. Sửa đi kèm `baseRev`;
  lệch thì 409 `SAVED_CONFLICT` kèm bản trên server, người dùng xác nhận rồi gửi lại `force:true`
  — đừng đổi thành "ghi sau thắng" im lặng. Xoá là xoá cứng (không `deleted_at`) vì máy khách
  đọc lại cả danh sách. Trần (`cloud.maxItems` / `cloud.maxMegabytes` trong `app_settings`) là
  trần mềm: kiểm trước khi ghi nên hai lần lưu cùng lúc có thể vượt một mục. `payload` là JSON
  tuỳ trang công cụ, backend chỉ kiểm là object ≤ 256 KiB; route ghi khai `bodyLimit` gấp đôi để
  payload quá cỡ vẫn ra mã `CLOUD_ITEM_TOO_LARGE` thay vì 413 trần của Fastify.
- `data/tool-catalog.json` sinh từ frontend (`node scripts/export-tool-catalog.mjs`); sửa
  danh mục / chữ catalog mà quên xuất lại là test `tool-catalog-export.test.ts` bên frontend đỏ.
- `nodemailer` ≥ 10 tự mang type — đừng cài `@types/nodemailer` (xung đột khai báo).

## Luật nghiệp vụ không được phá

- Envelope phẳng `{ok, ...}` và `Cache-Control: no-store` trên các endpoint công khai.
- Gói quy tắc: hàng trong `rule_packages` bất biến, mọi stage / activate / rollback ghi
  `rule_audit`. Một loại có NHIỀU gói đã phát hành (`rule_published`); gói áp dụng là gói có
  `effective_from` muộn nhất mà vẫn còn hạn vào **ngày Việt Nam** (`rule-dates.ts`, không
  dùng ngày UTC). Hết hạn hay bị rút thì gói trước tự áp dụng lại. `rule_active` là bảng cũ,
  được dồn sang `rule_published` lúc khởi động. Trần dữ liệu một gói 4 MB
  (`MAX_RULE_DATA_LENGTH`); kiểm theo loại (`electricity`, `vat`, `payroll`, `addresses`) ở
  `rule-kinds.ts`, chặn ở `sign`/`stage`. Chữ ký Ed25519 tính trên JSON bỏ `signature`, khoá object sắp theo chữ cái
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
