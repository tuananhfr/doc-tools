# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Đọc `README.md` và `AGENTS.md` trước. Đây là app **độc lập về code** cho bản Free công khai
của Chuyện Nhỏ (DocTools), tách từ nhánh `/doc-tools` của `erpcons_frontend`; nằm chung repo
Git `doc-tools` với backend (`../backend`, NestJS), nối qua HTTP — không workspace, không
`file:` dependency, không import sang thư mục đó.

## Lệnh

```bash
npm ci                 # Node 24+, npm 11.11 (lockfile đã kiểm với bộ này)
npm run dev            # next dev --webpack, cổng 3002
npm run build          # next build --webpack + sinh public/offline-manifest.json
npm run start          # phục vụ bản build, cổng 3002
npm test               # vitest run — chỉ logic thuần
npm run lint           # = tsc --noEmit (repo KHÔNG có eslint)
npx vitest run src/features/tools/rules/services/signed-rules.test.ts   # một file test
```

- **Bắt buộc `--webpack`**, không Turbopack: `next.config.mjs` dựa vào
  `NormalModuleReplacementPlugin` (thay `useHubPrefs`, nạp `pdfium.wasm` dạng `?url`).
- `postinstall` / `predev` / `prebuild` chạy bốn script `scripts/prepare-{video,pdfjs,background-removal,tts}.mjs`,
  chép core FFmpeg, file phụ của pdf.js, runtime xoá nền và phonemizer đọc văn bản vào `public/vendor/`. Thiếu thư mục
  nào ở đó thì chạy lại `npm ci`. `prepare-ocr-models.mjs` **không** nằm trong chuỗi này (chỉ
  chép model HTR đã duyệt — hiện chưa có).
- Vitest chỉ nhận `src/**/*.test.ts`, môi trường `node` (không DOM) — file `.test.tsx` bị
  bỏ qua im lặng. `TZ` cố định `Asia/Ho_Chi_Minh` trong `vitest.config.ts`.
- `public/offline-manifest.json` do `npm run build` sinh và đã gitignore (từng bị track,
  build xong là chặn `git pull` trên server). Service worker chỉ đăng ký ở production nên
  dev không cần file này.
- `npm run deploy` chỉ dành cho server Linux (build rồi `sudo systemctl restart
  doc-tools-frontend`); quy trình ở README.

Kiểm thử đầu-cuối (không chạy trong CI, cần app đang chạy + Chrome + Playwright):
`scripts/doc-tools/check-*.mjs` và `golden.mjs` đọc `BASE` (vd
`BASE=http://localhost:3002/chinh-sua-pdf`) và `PLAYWRIGHT_DIR`; tệp mẫu sinh bằng
`node scripts/doc-tools/make-fixtures.mjs`. `scripts/verify-parity.mjs` /
`verify-extra.mjs` so với ERPCons chạy ở cổng 3000; kết quả vào `qa-output/` (gitignore,
đổi bằng `QA_OUT`). Kiểm chứng UI = screenshot responsive + xử lý tệp thật, build xanh
chưa đủ.

## Kiến trúc chạy

**Next.js chỉ là vỏ; UI là một React Router data router.** `app/[lang]/layout.tsx` mount
`ToolsProviders` + `ToolsRouter` cho MỌI trang, nên `app/[lang]/page.tsx`,
`app/[lang]/[tool]/page.tsx` chỉ lo metadata / `generateStaticParams` / redirect rồi `return null`. Router được giữ
nguyên để bảo toàn handoff tệp giữa công cụ, screen identity và cảnh báo rời trang —
đừng chuyển công cụ sang route của Next.

- `src/runtime/` là lớp ghép duy nhất giữa Next và code copy sang:
  `ToolsRouter.tsx` (memory router khi SSR, browser router ở client) ·
  `tool-screens.tsx` (map `ToolScreen` → component) · `useHydratedHubPrefs.ts` (thay
  `hooks/useHubPrefs` qua webpack, vì `localStorage` không có lúc SSR).
- **Engine chỉ chạy trên trình duyệt**: mọi màn công cụ nạp bằng
  `dynamic(() => import(...), { ssr: false })`. Import tĩnh pdf.js / tesseract / ffmpeg
  vào đường SSR là build hoặc hydrate vỡ.
- `/xoa-phong` tự động dùng U2-NetP trong worker CPU/WASM một luồng. Model được track ở
  `public/vendor/background-removal/`; runtime sinh từ npm bằng `scripts/prepare-background-removal.mjs`.
  Chỉ tải khi chọn ảnh; kết thúc worker sau mỗi lượt, khi hủy hoặc rời trang để không giữ
  heap WASM. Cọ dùng alpha mềm; thuật toán màu ở `background-removal.ts` vẫn phục vụ ảnh thẻ.
  Nguồn, giấy phép và giới hạn RAM ở `docs/background-removal.md`.
- `/doc-to-van-ban` có giọng Piper tiếng Việt (model 63 MB track ở `public/vendor/tts/`,
  phonemizer espeak-ng WASM sinh bằng `scripts/prepare-tts.mjs`) và **dùng chung runtime ort
  của `/xoa-phong`** — đổi phiên bản `onnxruntime-web` phải sửa cả hai cấu hình. Emscripten của
  phonemizer không nhận ra module worker, nên byte được đưa qua `wasmBinary`/`getPreloadedPackage`.
  `AudioContext` phải tạo ngay trong lượt bấm (Safari). Chia đoạn trên văn bản GỐC (giữ offset để
  bôi vàng) rồi mới chuẩn hoá từng đoạn — chuẩn hoá cả bài trước là lệch vị trí bôi. Chi tiết, giấy
  phép còn mở ở `docs/read-aloud-tts.md`.
- `src/proxy.ts` (middleware của Next) xử lý link cũ `/doc-tools/*` và `?tool=` trước SSR,
  và thêm dấu `/` cuối cho trang chủ khi có prefix.
- Route: `/` landing giới thiệu · `/cong-cu` danh mục đầy đủ (lọc bằng query `q`, `nhom`) ·
  `/<slug>` một công cụ · `/og/<slug>` ảnh chia sẻ PNG tiếng Việt (route Node, prerender
  cho công cụ `ready`, revalidate theo ngày, font cục bộ — không gọi ra ngoài) ·
  `/og/<slug>/<lang>` bản ngôn ngữ khác (xem mục Đa ngôn ngữ).
- **Trang site** (`/xay-dung`, `/gia-dinh`, `/tai-lieu-pdf`…) cùng tầng với slug công cụ:
  khai slug ở `features/site/config/site-pages.ts` (test chặn trùng slug công cụ; sitemap
  đọc từ đây), `app/[lang]/<slug>/page.tsx` cho metadata, và route tĩnh trong `ToolsRouter.tsx`
  **trước** `:tool` — thiếu route thì Next prerender được nhưng client rơi vào `:tool` và
  về trang chủ. Trang nhóm dùng chung `CategoryHubPage`, nội dung ở `config/hub-pages.ts`;
  trang nội dung khai tiêu đề/mô tả ở `SITE_PAGE_META`. Bài hướng dẫn (`config/guides.ts`)
  trích nguyên nhãn nút của công cụ — đổi nhãn thì sửa cả bài. `support-faq.ts`, `legal.ts`
  và bảng `/xu-ly-du-lieu` là lời hứa về dữ liệu: đổi luồng gửi dữ liệu (đếm lượt, góp ý,
  `processing`) phải sửa cả ba trước khi phát hành. Phần tài khoản / Pro / AI / xoá tài khoản
  của trang pháp lý là bản **chờ duyệt pháp lý**: `LEGAL_DRAFT` (`legal.ts`) bật băng báo trên
  `/dieu-khoan`, `/quyen-rieng-tu` và `/xu-ly-du-lieu`; duyệt xong thì tắt cờ, đổi `LEGAL_UPDATED`.
  Câu báo của `/xu-ly-du-lieu` nằm ở `site.json` (`data.draftNotice`) vì namespace `legal` nạp
  lười, trang đó không có. vi + en là bản dịch thật, 13 locale còn lại đang chép en.
- Route động (`[tool]`, `huong-dan/[guide]`): `redirect()` ở lần render động đầu tiên
  khiến Next 16 trả HAI header `Location`, Chrome gộp thành URL hỏng. Slug lạ của bài
  hướng dẫn vì thế được chuyển hướng phía client (`GuidePage`).

### Đa ngôn ngữ (15 locale, `src/i18n/`)

- Danh sách ở `i18n/locales.ts`. **vi không có tiền tố**: `proxy.ts` rewrite `/x` →
  `/vi/x` và 308 `/vi/*` về `/x`; ngôn ngữ khác là `/<code>/<slug>`, slug vẫn tiếng Việt.
  Đổi ngôn ngữ = tải lại trang + cookie `cn_locale`; không đọc `Accept-Language`.
- Chuỗi ở `i18n/messages/<locale>/<namespace>.json`, kiểu khoá sinh từ bản vi.
  `messages.test.ts` bắt đủ khoá, placeholder và **dạng số nhiều CLDR** ở cả 15 locale
  (fr có `many`, ar có 6 dạng) — thêm khoá là thêm cho cả 15. Code ngoài React dùng
  `translate()` của `@/i18n/runtime` (chỉ client); server dùng `getServerT`.
- **Đầu ra công cụ theo ngôn ngữ trang** (tên tệp, chữ in lên PDF/ảnh), trừ: chữ người dùng
  gõ, chuyển font tiếng Việt, đổi địa chỉ (chỉ cột trạng thái + tiêu đề CSV), đọc hoá đơn
  XML, đọc số thành chữ — vẫn tiếng Việt.
- Chữ in lên PDF (`createTextPreparer`): font gốc nếu đủ glyph → MỘT font Noto CJK đã cắt
  sẵn → không thì vẽ dòng đó lên canvas rồi nhúng PNG (ar/th/km/lo/my). Thêm chữ CJK vào
  messages thì chạy lại `python scripts/subset-cjk-fonts.py <thư mục Noto gốc>`, thiếu
  glyph là rơi xuống nhánh ảnh (không chọn được chữ).
- **RTL chỉ có ar**, sinh bằng `postcss-rtlcss` chế độ override (`postcss.config.mjs`, nhắc
  lại mặc định của Next vì config riêng tắt chúng). Đổi config PostCSS phải xoá
  `.next/cache/webpack/*-production`, không thì build dùng CSS cũ mà không báo gì. Toạ độ
  inline `left/top` của lớp phủ trên tài liệu cố ý không lật; icon mũi tên/chevron lật bằng
  rule `[dir='rtl']` trong `styles/base/reset.css`; cần giữ nguyên một luật thì `/*rtl:ignore*/`.
- Font UI theo hệ chữ: stack `:lang()` trong `styles/site/tokens.css` (Be Vietnam Pro chỉ
  phủ Latin).
- Ảnh OG `/og/<slug>/<lang>` sinh khi có request (ISR). Satori không shape được ar/th/lo/km/my
  (Ả Rập còn crash) nên các trang đó trỏ sang ảnh `en` — `features/site/server/share-image-locale.ts`.
- Manifest theo locale là **route** (`app/manifest.webmanifest`, `app/[lang]/manifest.webmanifest`),
  không phải `app/manifest.ts`: file convention đó đè `metadata.manifest`, mọi locale sẽ
  link về bản vi. `id`/`scope` chung để vẫn là một app.
- Offline chỉ precache vi. Trang ngôn ngữ khác chưa mở mà mất mạng thì `sw.js` chuyển sang
  bản vi cùng slug (danh sách locale lấy từ `offline-manifest.json`); trả shell `/` ở URL
  `/<lang>/...` là React Router báo 404.
- Namespace mới (`ocr`, `quality`, `entertainment`, chữ cộng đồng, `landing` trong `site.json`)
  hiện chỉ có vi + en thật; locale khác chép bản en chờ duyệt dịch. Có mặt ở cả 15 locale
  **không** có nghĩa là đã dịch.

### Base path

`NEXT_PUBLIC_BASE_PATH` chốt lúc build: rỗng cả local lẫn production
(`chuyennho.tekshot.ai`, domain riêng — xem `../CLAUDE.md` mục Production). Trước 09/10/2026
là `/doc-tools` trên lpc.vn; code vẫn phải chạy đúng khi có prefix. Đổi là phải build lại.

- Hằng `ROUTES` và leave guard luôn gốc ở `/`; React Router nhận `basename`.
- Mọi URL trình duyệt tự dựng (fetch API, asset trong `public/`, worker) **phải** qua
  `withBase()` (`utils/url.ts`). Link ra ERPCons (`NEXT_PUBLIC_ERPCONS_URL`) thì không.
- Worker FFmpeg cần URL tuyệt đối qua `withBase` vì webpack thay `import.meta.url`
  trong wrapper.
- Service worker, khoá cache và cơ chế khôi phục bản build cũ đều gói trong scope
  `<basePath>/`; trang chủ có prefix redirect sang dấu `/` cuối để nằm trong scope đó
  (`skipTrailingSlashRedirect` chỉ bật khi có prefix).

### Gọi backend

`next.config.mjs` rewrite `<basePath>/api/v1/{codes,tools,rules,sources,contributions,auth,admin,ai,ent,landings}/*`,
`/api/v1/me` và `/api/v1/me/*` sang `BACKEND_URL` (mặc định `http://127.0.0.1:3003`). Envelope
phẳng `{ok, ...}` — giữ nguyên. Module backend mới có route công khai mà quên thêm dòng ở đây
thì dev / production đều 404 (chỉ `/api/v1/mcp/` cố ý không qua Next — Apache proxy thẳng).

- **Số đếm chất lượng** (`/api/v1/tools/quality`) chỉ gửi khi `NEXT_PUBLIC_QUALITY_EVENTS=1`
  **và** người dùng đồng ý trong phiên hiện tại (chỉ nhớ trong RAM). Chỉ gửi chiều sự kiện /
  công cụ cố định, bỏ credentials + referrer; không bao giờ gửi hay xếp hàng câu tìm kiếm, tài
  liệu, nội dung sửa OCR. Lời công bố dùng chung namespace `quality` ở trang quyền riêng tư,
  hỗ trợ và xử lý dữ liệu.

### Cộng đồng (`features/community`)

`/de-xuat-tien-ich` và `/gop-y-quy-dinh` là trang site tĩnh, **không** có trong danh mục công
cụ lẫn catalog MCP; footer cả hai khung link tới chúng, tìm danh mục / nhóm không ra kết quả thì
gợi ý đề xuất. Runtime chèn `ToolFeedback` vào `ToolRoutePage` mà không remount màn công cụ.

- Form góp ý tại chỗ giữ nháp khi đóng, chỉ gửi chữ người dùng gõ + slug công cụ — không bao
  giờ gửi tệp / kết quả.
- Góp ý dữ liệu: slug địa chỉ / lương / tiền điện ánh xạ sang domain quy tắc tương ứng, còn lại
  dùng `legal` — vẫn phải duyệt tay + phát hành bằng gói ký. Không suy ra snapshot đang áp dụng.
- Góp ý lỗi / cải tiến đi `RECEIVED → TRIAGED → IN_PROGRESS → RESOLVED → RELEASED` (+ `REJECTED`,
  `DEDUPED`); gửi trùng bản đã đóng nhận 200 `DEDUPED` (câu báo `feedback.dedupedNote`), trùng bản
  đang mở vẫn 409. Loại "Đề xuất công cụ mới" trong form góp ý đi luồng `ideas`, luôn ẩn danh. Trang
  công cụ không có footer đầy đủ, chỉ `ToolFooterLinks`. Ý tưởng và dữ liệu giữ trạng thái duyệt cũ.
  Khoá gửi lại chỉ trong RAM; lưu biên nhận là tải tệp chữ do người dùng bấm.
  Kết quả tra / bổ sung nguồn gắn với biên nhận đã xác minh, bị huỷ khi đổi input hoặc unmount.

### Tài khoản (`features/account`, spec `../docs/pro/pro-spec.md`)

Đăng nhập email + mật khẩu (mã 6 số chỉ dùng khi tạo tài khoản / quên mật khẩu), phiên là
cookie `cn_session` của backend. Trang `/dang-nhap`,
`/tai-khoan`, `/de-xuat-cua-toi` nằm trong `ACCOUNT_PAGES` (`site-pages.ts`): vẫn thuộc `SITE_PAGE_SLUGS` để kiểm
trùng slug, nhưng sitemap lọc ra và metadata đặt `noindex`.

- Request ghi phải kèm `X-CN-Request: 1` (backend chặn CSRF bằng header này + `Origin`) —
  đi qua `account.service.ts`, đừng `fetch` tay.
- `useMe()` cố ý trả `data` rỗng **trong lúc hydrate**: trang có namespace i18n nạp lười
  hydrate sau khi `/me` đã về, vẽ theo kết quả đó là lệch HTML máy chủ (hydration error).
- Sau đăng nhập không có callback điều hướng: `login` / `password/setup` ghi phiên vào cache `/me`,
  `LoginPage` tự `<Navigate>` tới `?next=` (đã lọc bằng `safeNextPath`). Tạo tài khoản và quên mật khẩu
  là `?mode=signup|reset` của cùng trang (không phải route riêng) để `next` theo qua mọi bước; backend
  xử lý hai chế độ y hệt nhau, chỉ khác chữ. Tài khoản cũ chưa có mật khẩu (`user.hasPassword: false`)
  đặt ở thẻ Mật khẩu trang tài khoản (`PasswordSetupForm mode="set"`).
- Pro hết hạn ở mốc **nửa đêm VN của ngày hôm sau** (loại trừ) — hiển thị phải lùi 1 giây.
- Kiểm tra code theo capability (`/me` trả `capabilities`), không theo tên gói. Dòng nào trên
  trang tài khoản chưa có tính năng thật thì `live: false` (chip "Sắp có") trong
  `config/capabilities.ts`.
- `POST /contributions` của `ContributionForm` (community) **phải** kèm `X-CN-Request`:
  thiếu header thì backend lờ cookie và coi là khách — không lỗi, chỉ là đề xuất không vào
  "Đề xuất của tôi". Khối ghi tên là `ContributionAccountBox` (public API của account).
- Chuỗi có con số trong `account.json` dùng biến khác `count` (`{{total}}`, `{{more}}`):
  `{{count}}` bắt đủ dạng số nhiều ở mọi locale (test parity), 13 locale đang chép bản en.
- Header đã chật: thêm nút vào `.cn-header-actions` phải đo lại 360–1440px (nhãn nút tài khoản
  chỉ hiện từ 1400px, dưới 360px nút tài khoản chuyển vào menu trượt).
- `/me` trả `staff` (`null` với tài khoản thường). Staff thấy thêm nút khiên ở header / mục
  "Quản trị" trong menu trượt, và đăng nhập không có `?next=` thì vào thẳng `/quan-tri`.
- Tự xoá tài khoản (`DeleteAccountSection`): gõ lại đúng email mới bật nút; staff chỉ thấy ghi
  chú (backend trả 409 `STAFF_ACCOUNT`). Xoá xong `AccountPage` giữ cờ `deleted` để KHÔNG
  `<Navigate>` sang đăng nhập: React Router v7 commit điều hướng trong transition, còn reset
  `/me` là cập nhật khẩn nên trang kịp vẽ lại với "khách" trước — `await navigate()` không cứu được.
- `PlanSection` báo "sắp hết hạn" khi Pro còn ≤ 7 ngày, cùng mốc với thư nhắc của backend.

### Trợ lý AI (`features/ai`, bản Pro)

Mỗi thành viên Pro dán khoá AI của mình ở `/tai-khoan/ai`; backend dựng provider + agent
`cn-<userId>` trên GoClaw dùng chung. Màn chat là công cụ `tro-ly` (`AssistantPage` của
`byoai` chỉ còn gọi `AiAssistant`). Trình duyệt xin vé `POST /ai/session` rồi nối WebSocket
**thẳng** tới GoClaw — backend không proxy luồng chat. `ws-client.ts` / `useAgentChat.ts`
chép từ ERPCons, giữ nguyên các luật ở đó (khoá phiên do client sinh trước khi gửi,
`sessions.preview` là nguồn sự thật sau mỗi lượt, thứ tự khôi phục sau F5, `stream: true`).

- `ws-client.ts` có bộ đếm `generation`: StrictMode gọi connect → disconnect → connect, connect
  đầu đang chờ vé mà vẫn mở socket là có HAI socket, socket cũ báo "connected" trước khi socket
  thật mở xong → `sessions.list`/`preview` hỏng câm, F5 ra khung chat trống. (Bản ERPCons chưa có.)
- Câu trả lời vẽ bằng React node (`ChatMessageBody`), **không bao giờ** `dangerouslySetInnerHTML`.
  Khối ```` ```cn-action ```` chỉ thành nút khi đúng shape `parseCnAction` VÀ slug là công cụ
  `ready` trong danh mục đang chạy — model có thể bị dụ viết bất cứ gì.
- Enter để gửi phải bỏ qua lúc đang gõ dấu (`isComposing`): Telex/VNI xác nhận âm tiết bằng Enter.
- `features/ai` không import `features/account` ở component dùng chung (`AiAssistant`,
  `AiAccountCard`, `ProInvite` nhận props) — `AccountPage` import `@/features/ai`, đi ngược là
  vòng import. Chỉ `pages/AiSettingsPage` (nạp lười từ `ToolsRouter`) dùng `useMe`.
- Kiểm nguồn (`AiSourceCheckPanel`) ở `tien-dien` / `luong` / `doi-dia-chi` thay màn chép
  prompt + dán JSON cũ (`byoai` đã gỡ, chỉ còn `AssistantPage`). Panel nhúng `AgentChat`
  với `storageKey` riêng mỗi công cụ (`cn.ai.check.<toolId>`) để không giẫm phiên của
  `tro-ly`, và `starter` gửi tin mở đầu: chỉ gửi sau khi `restored` (đã mở lại phiên cũ),
  gửi sớm hơn là F5 bắn lại tin. `beforeSend` ghi `/ai/source-checks` với khoá phiên MỚI
  (sinh trước khi gửi). Kết quả gửi kèm qua `clipResult` (che email / SĐT / URL nội bộ).
- Nháp đề xuất do agent soạn (`DraftReview`): không dòng nào được chọn sẵn, nút gửi khoá
  tới khi có dòng + ô "đã đối chiếu". Agent không có đường gửi — gửi luôn là việc của người.
- Sửa danh mục / chữ catalog → chạy `node scripts/export-tool-catalog.mjs` (backend đọc
  `backend/data/tool-catalog.json` cho tool MCP); test `tool-catalog-export.test.ts` canh.
- Dòng cam kết đầu trang `tro-ly` là `privacyNote` trong catalog (câu hỏi đi tới nhà cung cấp
  AI) — công cụ này không còn "chạy trên máy bạn".
- **Đính kèm** (`useChatAttachments` + `utils/attachments.ts`): ảnh tải lên `POST /ai/uploads`
  ngay khi chọn, lúc gửi mới xin link một lần rồi đưa vào `chat.send` **không kèm `filename`**
  (có tên là vault của GoClaw tóm tắt ảnh bằng khoá nền của tenant — xem `backend/CLAUDE.md`),
  gửi xong thì xoá upload. Tệp chữ (TXT/MD/CSV/JSON, UTF-8 chặt, ≤ 256 KB / 40.000 ký tự) đọc
  ở trình duyệt, ghép vào tin nhắn thành khối ```` ```cn-file name="…" ```` với hàng rào dài hơn
  mọi chuỗi backtick trong nội dung; `splitUserMessage` tách ngược khi hiện lịch sử. PDF / Word /
  Excel / âm thanh bị từ chối. Lần đầu đính kèm hỏi đồng ý (`cn.ai.attachConsent`).
- Lịch sử: `media_refs` trong `sessions.preview` là link `/v1/files/...?ft=` đã ký, **tương đối
  với gốc HTTP của GoClaw** → ghép với `filesUrl` của vé (`toChatMedia`, chỉ nhận đường dẫn bắt
  đầu `/v1/files/`). Link ký sống vài phút; ảnh hỏng thì `MediaImage` lùi về chip tên tệp.
  Tải lại trang khi chip còn chưa gửi thì upload thành mồ côi (unmount không chạy) — nằm tới khi
  hết hạn lưu (mặc định 7 ngày) và vẫn tính vào hạn mức ngày.

### Mục đã lưu (`features/cloud`, bản Pro)

Kết quả đã lưu, công cụ yêu thích và lịch sử kiểm nguồn, trang `/tai-khoan/da-luu`
(`SAVED_PAGE_PATH`, route React Router như `/tai-khoan/ai`, `noindex`, không có trong sitemap).
Danh sách trên server là bản duy nhất — không có kho cục bộ, "đồng bộ" là đọc lại
(`useSavedItems`: khi quay lại tab + mỗi 60 s). Khoá query nằm dưới `['account', …]` để đăng
xuất xoá sạch.

- Hết Pro là **chỉ-đọc** (`writable: false`): vẫn mở / xoá / bỏ sao, ẩn nút lưu, đổi tên và
  nút sao trên trang công cụ. Tài khoản thường chưa từng lưu thì không thấy thanh lưu.
- Lưu đè gửi `baseRev`; 409 `SAVED_CONFLICT` → `window.confirm` hiện tên + giờ bản trên server,
  đồng ý thì gửi lại `force: true`. Đừng tự ghi đè im lặng.
- Công cụ muốn lưu được thì truyền một `SaveAdapter` `{snapshot, restore}` vào `SaveResultBar`
  (hiện có `tien-dien`, `luong`, `doi-dia-chi`). Payload có `v` và được **kiểm lại khi mở**
  (`*-saved.ts` cạnh utils của công cụ, có test) — payload do server trả về coi như dữ liệu lạ.
  Helper đọc payload ở `utils/saved-payload.ts`, không ở `features/cloud`: codec import cloud
  là kéo React vào test node.
- Link `?saved=<id>` trên trang công cụ mở mục đó một lần rồi tự gỡ tham số (`replace`).
- Hết Pro, `GET /me/saved` trả `purgeAt` (giây): băng chỉ-đọc ghi ngày bị xoá. Backend chỉ xoá
  sau khi đã gửi thư báo đủ 7 ngày, nên ngày này có thể lùi về sau mốc 90 ngày.
- Nút sao gắn vào đầu trang công cụ qua prop `headerAction` của `ToolRoutePage` —
  `runtime/ToolFavourite.tsx` ghép `useMe` với `FavouriteButton` (hub không import feature,
  cloud không import account ở component dùng chung).
- **i18next không bắt sai tên biến**: truyền `{count}` cho chuỗi `{{total}}` vẫn type-check
  và in nguyên `{{total}}` ra màn hình. Chuỗi có số trong `cloud.json` dùng `total` / `used`
  (tránh `count` vì kéo theo dạng số nhiều ở 15 locale).

### Khu quản trị (`features/admin`, `/quan-tri`)

Chỉ tiếng Việt, **không đi qua i18n** (chuỗi viết thẳng trong component — cố ý, không thêm
vào 15 file message). `noindex, nofollow`, không có trong sitemap, HTML không vào precache.

- Route React Router `/quan-tri/*` khai **ngoài** `ToolsLayout` trong `runtime/ToolsRouter.tsx`
  (khung riêng: sidebar + topbar), nạp `next/dynamic` `ssr:false` — khách không bao giờ tải
  chunk đó. Trang con dùng `<Routes>` lồng trong `AdminApp.tsx`; chi tiết mở bằng `?id=` để
  không cần segment động (export tĩnh).
- Trang Next `app/[lang]/quan-tri/[[...path]]/page.tsx` chỉ sinh cho `vi`.
  **`generateStaticParams` phải tự trả `lang: 'vi'` và KHÔNG trả `[]` cho locale khác**:
  Next 16 bỏ cả route khỏi bản build (không lỗi, không cảnh báo) hễ một lần gọi theo
  locale cha trả mảng rỗng. `proxy.ts` đưa `/<lang>/quan-tri` về `/quan-tri` và không áp
  ngôn ngữ đã nhớ cho khu này.
- `html/body` của site không cuộn: `.cn-admin-body` là hộp cuộn của khu quản trị (như
  `.erp-tools-guest` của site). Đặt `position: sticky` hay đo cuộn thì đo trên hộp đó.
- Mọi request admin (kể cả GET) gửi `X-CN-Request: 1` — đi qua `admin.service.ts`. Trạng
  thái cổng vào do `useWhoami()` quyết: `SIGNED_OUT` → thẻ đăng nhập, `NOT_STAFF` → về `/`,
  `STAFF_REAUTH` (phiên staff quá 12 giờ) → đăng xuất rồi đăng nhập lại.
- Ẩn mục menu chưa đủ: mỗi trang bọc `RequirePermission`, vì link dán thẳng vẫn vào được.
- Thêm mục quản trị = một dòng `ADMIN_SECTIONS` (`config/admin-nav.ts`) + một `<Route>` trong
  `AdminApp.tsx`; slug mới tự có trang tĩnh. **Chỉ một segment**: layout `[lang]` đặt
  `dynamicParams = false`, nên `/quan-tri/<mục>/<x>` vào được khi bấm link nhưng 404 khi F5.
  Mở chi tiết bằng query (`?id=`, `?trang=`).

### Trang giới thiệu cho website khác (`features/site-landing`, `/gioi-thieu/<mã>`)

Mỗi website ngành reverse-proxy **một** đường dẫn của nó tới `<basePath>/gioi-thieu/<mã>`.
Nội dung do quản trị sửa (`/quan-tri/trang-gioi-thieu`, backend module `landings`). Mẫu cấu hình
proxy (nginx, Apache, Cloudflare, Next, PHP) ở `docs/landing-host-proxy.md`.

- Route handler `app/gioi-thieu/[site]/route.ts` trả **HTML tự đủ**: CSS inline, **không một
  thẻ `<script>`**, mọi URL tuyệt đối về `NEXT_PUBLIC_SITE_URL` + basePath (`server/render-landing.ts`).
  URL tương đối sẽ trỏ về domain của website gắn trang và vỡ.
- **Không dùng `react-dom/server` trong route handler**: Next 16 chặn lúc build. HTML dựng bằng
  template chuỗi + `esc()` (`render/landing-html.ts`). Mọi chữ từ quản trị phải đi qua `esc()`;
  màu nhấn bị ép về hex (`utils/landing-theme.ts`) vì nó nằm trong CSS inline.
- CSS (`styles/landing-css.ts`, tiền tố `cnl-`) đặt reset trong `:where(.cnl)`. Reset có độ
  ưu tiên cao từng thắng `.cnl-button` (nút trắng chữ trắng). Đã có test chặn lỗi này.
- Font phục vụ qua `app/gioi-thieu/font/[file]` với `Access-Control-Allow-Origin: *`, vì trình
  duyệt tải `@font-face` khác domain bằng CORS. Icon là SVG inline đọc từ `bootstrap-icons/icons`
  lúc render.
- `proxy.ts` (matcher) và `public/sw.js` bỏ qua `/gioi-thieu/`: trang này không có locale
  và không vào precache. Trang không có trong sitemap. Canonical lấy từ `canonicalUrl` của trang.
- Cache: dữ liệu backend `revalidate` 60 s; HTML trả `public, max-age=60, stale-while-revalidate=600`;
  404/503 `no-store`.
- Xem trước trong quản trị (`admin/utils/landing-preview.ts`) gọi **cùng** `landingDocumentHtml`
  + `pickLandingTools`, vẽ vào iframe `srcdoc` `sandbox="allow-same-origin"` (cần để font icon
  cùng origin tải được; trang không có script). Trình duyệt không đọc được file SVG, nên khung
  chép rule `@font-face`/`.bi` của trang quản trị vào. Liên kết trong khung bị tắt: link `#mục`
  trong `srcdoc` sẽ phân giải theo URL trang cha và nạp cả trang quản trị vào khung.
- Type `LandingDoc` là bản sao của `backend/src/landings/landing-content.ts`; trần độ dài ở
  `admin/config/landing-form.ts` cũng chép từ đó. Thêm trường thì sửa cả ba chỗ.

### Trang chủ (`features/site/landing`, route `/`)

`/` dùng `LandingLayout` **ngoài** `ToolsLayout` nhưng vẫn chung provider + React Router; danh
mục và trang công cụ giữ khung + engine cũ. Hộp cuộn là `.cn-landing-scroll` — hash điều hướng
nhắm bảy section bên trong hộp đó. Link cũ `?tool=` vẫn đi qua `legacyToolPath`.

- `LandingPage` chỉ ghép component; chữ ở khoá `landing` của `site.json` (15 locale). Nút đổi
  ngôn ngữ dùng lại `LOCALES` / `localeHref` / `switchLocale`, nút theme dùng lại
  `useThemeMode` (có cả chế độ `field`).
- Ảnh minh hoạ ở `public/landing` là ảnh chụp giao diện tiếng Việt với dữ liệu mẫu (có ghi
  chú như vậy) — không nướng chữ hay nút đang chạy vào ảnh.
- CSS scoped dưới `styles/site/landing`. Phải giữ: mục tài khoản / chia sẻ trong menu, link
  website / pháp lý + `QualityConsent` ở footer, và ranh giới giữa "xử lý trên máy" với lời công
  bố AI / lưu trữ online.
- Các component trang chủ cũ vẫn nằm trong repo là code lịch sử, chờ một yêu cầu dọn riêng —
  đừng tự xoá.

### OCR Free V2 (`ocr-pipeline`, `ocr-export`)

- `ocr-pipeline` chạy các lượt so sánh cục bộ có giới hạn, biến đổi trên ảnh gốc, rồi bắt người
  dùng duyệt rõ từng từ / trường / bảng. Đề xuất ô đã xử lý giữ id lượt + id ứng viên **tách
  khỏi** chữ thô bất biến; xuất phải có xác nhận. Trường nhập tay liên kết với từ của lớp chữ
  sửa được.
- `ocr-export` xuất TXT/PDF/DOCX/XLSX/CSV/JSON đã duyệt; kết quả giàu và nội dung sửa chỉ ở RAM.
  Khoá cache gồm hash nguồn, góc xoay trang, profile và phiên bản pipeline — đổi pipeline mà
  không tăng phiên bản là đọc nhầm cache cũ.
- HTR chữ viết tay **đang tắt** tới khi đủ bằng chứng model / giấy phép / trình duyệt /
  ground-truth (`scripts/doc-tools/benchmark/handwriting-models.json`, `prepare-ocr-models.mjs`).
  Chế độ hỗn hợp chỉ là thử nghiệm Tesseract, bắt duyệt toàn bộ.

### Giải trí (`features/tools/entertainment`)

Ba màn nạp lười `/than-so-hoc`, `/bai-tay`, `/tarot` + panel nguồn / xuất gắn vào `/lich-am`.
Cả ba là mục `ready` bình thường trong danh mục, dùng metadata route công cụ chung;
`/kham-pha-giai-tri` gom chúng với âm lịch. Không cần cờ bật.

- POST bỏ cookie tài khoản; tính toán cần người dùng đồng ý nhập liệu rõ ràng; báo cáo PDF/PNG
  vẽ trên máy. Chữ giao diện ở namespace `entertainment`.
- Kho diễn giải tiếng Việt khoá theo lá + chiều / chỉ số + giá trị, UI và bản xuất dùng chung.
  Kết luận dùng gợi ý vai lá + liên kết chủ đề số (biên tập riêng), có phần lập luận mở rộng
  được, và tách Năm cá nhân khỏi nét cốt lõi.
- Đọc `docs/entertainment-interpretations.md` trước khi đổi nghĩa lá / số, luật tổng hợp, vị trí
  trải bài, quy ước phương pháp hay nguồn gốc. Chữ pháp lý / quyền riêng tư phải khớp
  `../backend/docs/entertainment.md`.

### Workspace adapter (`runtime/workspace-registry.ts`)

Metadata runtime của công cụ nằm ở `workspace-registry.ts`, trỏ tới config template gốc của
từng feature. Giữ nguyên router và hợp đồng `FlowTask` / `FlowResult` cục bộ.

- Lịch Gia Đình là sản phẩm riêng ở URL cũ; tính năng xây dựng nâng cao thuộc ERPCons — đừng
  kéo vào đây.
- QR động là nhánh server mới **duy nhất**: đồng ý lưu trữ rõ ràng, khoá quản lý hiện một lần,
  biên nhận trên máy (tuỳ chọn), proxy `/api/v1/codes`. QR tĩnh và in nhãn vẫn chạy cục bộ.
- Chi tiết ở `docs/workspace-repair-v1-1.md` và `../backend/docs/api.md`.

## Thêm một công cụ

Ba chỗ, thiếu một là công cụ không hiện hoặc type-check vỡ:

1. `features/tools/hub/config/tool-list.ts` — mục danh mục (slug, nhóm, `ready`/`soon`,
   `synonyms` chỉ ghi việc làm được HÔM NAY).
2. `features/tools/hub/types/tool.types.ts` — thêm giá trị vào union `ToolScreen`.
3. `runtime/tool-screens.tsx` — `dynamic(..., { ssr: false })` + một dòng trong `TOOL_SCREENS`.

`device` bắt buộc (`{ offline: 'yes'|'after-first-use'|'no', needs? }`), phân loại theo luật R1–R3 ở đầu
`hub/config/tool-device.test.ts`; `'yes'` chỉ khi `scripts/doc-tools/check-offline.mjs` qua.

Công cụ mới đặt trong feature riêng `features/tools/<nhóm>/`. Tắt một công cụ trên
production không cần sửa code: `NEXT_PUBLIC_TOOLS_OFF=<id>,<id>`.
Công cụ thuộc một nhóm việc có thanh tab (QR, tính toán, ảnh) → thêm id vào `hub/config/workspace-tabs.ts`.
Thanh tab do `ToolRoutePage` vẽ (`WorkspaceTabs`, tab là link giữa slug) — màn công cụ không tự vẽ tab nhóm.

## Code copy từ ERPCons — giữ nguyên hành vi

- Workspace công cụ, danh mục, engine và kết quả đầu ra phải giữ đúng hành vi gốc.
  Đổi giao diện thì làm ở lớp vỏ (`features/site`, `styles/site/workspace-*.css` qua
  token scoped), không sửa engine, font con dấu hay screen identity.
- `docs/upstream-manifest.json` ghi SHA-256 của 450 file lúc copy — là **bản ghi lịch
  sử**, không có script nào kiểm. `tool-list.ts` và `tool.types.ts` có trong manifest
  nhưng đã sửa để thêm công cụ mới, nên lệch hash ở đó là đúng.
- **`docs/upstream/` mô tả repo ERPCons, không phải repo này.** Những thứ nó nhắc mà ở
  đây KHÔNG có: biến `VITE_*` (ở đây là `NEXT_PUBLIC_*`, vd `NEXT_PUBLIC_TOOLS_OFF`),
  plugin `shareMeta` của Vite (thay bằng route `/og/[tool]`), `routes/tools.routes.tsx`
  (thay bằng `runtime/`), nhánh `/tools` trong app. Comment đầu `tool-list.ts` về
  `shareMeta` cũng là dư âm từ đó.
- `features/inventory/trace` (thẻ tra mã `/trace/*` của ERPCons) chỉ được `qr/ScanResultList`
  vẽ khi nhánh là `kind: 'app'`. Repo này chỉ dựng nhánh `public` nên thẻ không bao giờ hiện,
  và `/trace` cũng không có trong rewrite. Đây là phần còn lại của bản copy, không phải tính năng
  đang chạy; đừng nối nó vào backend.
- Comment trong code copy sang viết tiếng Việt; code lớp vỏ mới (`runtime/`, `site/`)
  viết tiếng Anh — theo phong cách của file đang sửa.

## Giao diện

- Website công khai (`features/site`, `styles/site/`) dùng token **xanh/navy** riêng
  (`--cn-*` trong `styles/site/tokens.css`) và font Be Vietnam Pro tự host — đây là bản
  redesign đã duyệt.
- `ERPcons_Design_System.md` (Crimson Ice) là hệ của code gốc ERPCons
  (`styles/tokens.ts`, `styles/theme.ts`); màn công cụ được phủ lại bằng
  `workspace-*.css`. Modal Bootstrap của công cụ ăn token qua `body:has(.cn-shell--tool)`.
- Khung công cụ: `ToolsLayout` = header website + vùng cuộn công cụ + footer (chỉ trang
  website); màn công cụ có tiêu đề, mô tả và dòng "xử lý cục bộ" chung.
- Token không màu ở `:root` (`styles/site/tokens.css`): `--cn-space-1..5` (4/8/12/16/24), `--cn-font-body`
  (16px; 18px khi `<html data-text-size="large">`), `--cn-tap` 44px cho mọi vùng chạm, `--cn-cta` 48px cho
  nút chính. Kích thước mới dùng token này, không viết 38/40px.
- "Chữ lớn" (`features/tools/hub/utils/text-size.ts`, khoá `cn.textSize`) đặt thuộc tính trước hydrate bằng
  `TEXT_SIZE_BOOT_SCRIPT` trong `app/[lang]/layout.tsx`; đổi trong menu giao diện của `GuestPrefs`.
- Gate a11y: `node scripts/doc-tools/check-a11y.mjs` (360/390/430 × light/dark/field; `TEXT_SIZE=large`;
  thêm trang bằng `PAGES=`) phải exit 0 trước khi phát hành. Không nới ngưỡng trong script để cho xanh.

## Ràng buộc nghiệp vụ

- **Tệp người dùng không bao giờ rời trình duyệt.** Lệnh mạng duy nhất của công cụ thường
  là bộ đếm lượt mở (gửi slug).
- Dữ liệu pháp lý / địa chỉ / lương / tiền điện chỉ được coi là "đã xác minh" khi đến từ
  gói quy tắc ký Ed25519 (`features/tools/rules/services/signed-rules.ts`, khoá
  `NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI`). Không có khoá → chỉ nhận tham số người dùng nhập.
  Trang dùng `useSignedRules(kind, parse)` + `RuleStatus` (`features/tools/rules/`): trạng
  thái `ready / none / invalid / unavailable` phải báo khác nhau, gói sắp hiệu lực hiện câu
  báo trước. `parse` là hằng ngoài component. Ngày so hiệu lực là ngày Việt Nam, khớp backend.
  Gói ký có thể mang `sourceId` (tuỳ chọn, nằm trong phần ký) trỏ sang `/api/v1/sources/:id`;
  `SourceFreshness` hiện nguồn + ngày kiểm, quá `sources.staleDays` (mặc định 90) thì cảnh báo vàng.
  Đổi địa chỉ KHÔNG có bảng tỉnh viết cứng: tỉnh lấy từ gói `addresses` (hoặc suy ra từ
  `wards`); thuế điện lấy gói `vat` trước, rồi `vatPercent` trong gói điện.
  Không đưa số liệu trong archive vào như luật hiện hành.
- Kiểm nguồn AI: chỉ gửi dòng người dùng tự chọn sau khi xác nhận đã đối chiếu; văn bản
  AI không bao giờ tự gửi hay tự xuất bản.
- Lịch Gia Đình V1: chỉ IndexedDB trên máy, có sao lưu / ICS / in, nhắc khi đang mở;
  chia sẻ online, đồng bộ tài khoản và Native còn chờ quyết định định danh/quyền riêng tư.
- Công cụ ảnh có sẵn GIỮ EXIF; chỉ công cụ xoá metadata mới gỡ.
- Video (`features/tools/video`): core FFmpeg GPL đã được duyệt, worker đơn luồng nạp
  lười; kết thúc worker sau mỗi job, revoke URL preview. Core ~32 MB nằm ở
  `optionalAssets` của offline manifest (cache khi dùng, không precache). Giới hạn, nguồn
  gốc và yêu cầu rà soát giấy phép ở `docs/video-engine.md`.

## Tài liệu trong repo

| Việc | Đọc |
| --- | --- |
| Tiến độ so với bộ tài liệu Chuyện Nhỏ, phần còn thiếu, thứ tự ưu tiên khi mâu thuẫn | `docs/chuyen-nho-implementation-map.md` |
| Hành vi gốc của công cụ (lưu ý: viết cho ERPCons) | `docs/upstream/doc-tools.md` |
| Engine video | `docs/video-engine.md` |
| Gắn trang giới thiệu vào website khác (mẫu proxy) | `docs/landing-host-proxy.md` |
| Phạm vi đã kiểm chứng | `docs/verification.md`, `docs/repo-split-verification.md` |
| Benchmark OCR Free + journey P0 (cách chạy, bộ mẫu, gate) | `docs/free-quality-benchmark.md` |
| Nguồn và giấy phép ảnh lá bài tây / Tarot | `docs/entertainment-artwork.md` |
| Ảnh minh hoạ còn thiếu của các trang site (kích thước, prompt vẽ) | `docs/site-illustrations.md` |
| Next.js 16 khác bản quen thuộc | `node_modules/next/dist/docs/` (xem `AGENTS.md`) |

Giữ tiếng Việt UTF-8 không BOM. Không commit / push khi chưa được yêu cầu rõ ràng.
