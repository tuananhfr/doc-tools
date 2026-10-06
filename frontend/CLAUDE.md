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
- `scripts/prepare-video.mjs` tự chạy ở `postinstall` / `predev` / `prebuild`, chép core
  FFmpeg vào `public/vendor/ffmpeg/`. Thiếu thư mục đó thì chạy lại `npm ci`.
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

**Next.js chỉ là vỏ; UI là một React Router data router.** `app/layout.tsx` mount
`ToolsProviders` + `ToolsRouter` cho MỌI trang, nên `app/page.tsx`, `app/[tool]/page.tsx`
chỉ lo metadata / `generateStaticParams` / redirect rồi `return null`. Router được giữ
nguyên để bảo toàn handoff tệp giữa công cụ, screen identity và cảnh báo rời trang —
đừng chuyển công cụ sang route của Next.

- `src/runtime/` là lớp ghép duy nhất giữa Next và code copy sang:
  `ToolsRouter.tsx` (memory router khi SSR, browser router ở client) ·
  `tool-screens.tsx` (map `ToolScreen` → component) · `useHydratedHubPrefs.ts` (thay
  `hooks/useHubPrefs` qua webpack, vì `localStorage` không có lúc SSR).
- **Engine chỉ chạy trên trình duyệt**: mọi màn công cụ nạp bằng
  `dynamic(() => import(...), { ssr: false })`. Import tĩnh pdf.js / tesseract / ffmpeg
  vào đường SSR là build hoặc hydrate vỡ.
- `src/proxy.ts` (middleware của Next) xử lý link cũ `/doc-tools/*` và `?tool=` trước SSR,
  và thêm dấu `/` cuối cho trang chủ khi có prefix.
- Route: `/` trang chủ · `/cong-cu` danh mục đầy đủ (lọc bằng query `q`, `nhom`) ·
  `/<slug>` một công cụ · `/og/<slug>` ảnh chia sẻ PNG (route Node, prerender cho công cụ
  `ready`, revalidate theo ngày, font cục bộ — không gọi ra ngoài).
- **Trang site** (`/xay-dung`, `/gia-dinh`, `/tai-lieu-pdf`…) cùng tầng với slug công cụ:
  khai slug ở `features/site/config/site-pages.ts` (test chặn trùng slug công cụ; sitemap
  đọc từ đây), `app/<slug>/page.tsx` cho metadata, và route tĩnh trong `ToolsRouter.tsx`
  **trước** `:tool` — thiếu route thì Next prerender được nhưng client rơi vào `:tool` và
  về trang chủ. Trang nhóm dùng chung `CategoryHubPage`, nội dung ở `config/hub-pages.ts`;
  trang nội dung khai tiêu đề/mô tả ở `SITE_PAGE_META`. Bài hướng dẫn (`config/guides.ts`)
  trích nguyên nhãn nút của công cụ — đổi nhãn thì sửa cả bài. `support-faq.ts`, `legal.ts`
  và bảng `/xu-ly-du-lieu` là lời hứa về dữ liệu: đổi luồng gửi dữ liệu (đếm lượt, góp ý,
  `processing`) phải sửa cả ba trước khi phát hành.
- Route động (`[tool]`, `huong-dan/[guide]`): `redirect()` ở lần render động đầu tiên
  khiến Next 16 trả HAI header `Location`, Chrome gộp thành URL hỏng. Slug lạ của bài
  hướng dẫn vì thế được chuyển hướng phía client (`GuidePage`).

### Base path

`NEXT_PUBLIC_BASE_PATH` chốt lúc build: rỗng khi local, `/doc-tools` trên lpc.vn. Đổi là
phải build lại.

- Hằng `ROUTES` và leave guard luôn gốc ở `/`; React Router nhận `basename`.
- Mọi URL trình duyệt tự dựng (fetch API, asset trong `public/`, worker) **phải** qua
  `withBase()` (`utils/url.ts`). Link ra ERPCons (`NEXT_PUBLIC_ERPCONS_URL`) thì không.
- Worker FFmpeg cần URL tuyệt đối qua `withBase` vì webpack thay `import.meta.url`
  trong wrapper.
- Service worker, khoá cache và cơ chế khôi phục bản build cũ đều gói trong scope
  `<basePath>/`; trang chủ có prefix redirect sang dấu `/` cuối để nằm trong scope đó
  (`skipTrailingSlashRedirect` chỉ bật khi có prefix).

### Gọi backend

`next.config.mjs` rewrite `<basePath>/api/v1/{tools,rules,contributions}/*` sang
`BACKEND_URL` (mặc định `http://127.0.0.1:3003`). Envelope phẳng `{ok, ...}` — giữ nguyên.
Bản Free không có đăng nhập tại chỗ; nút đăng nhập/Pro trỏ về ERPCons.

## Thêm một công cụ

Ba chỗ, thiếu một là công cụ không hiện hoặc type-check vỡ:

1. `features/tools/hub/config/tool-list.ts` — mục danh mục (slug, nhóm, `ready`/`soon`,
   `synonyms` chỉ ghi việc làm được HÔM NAY).
2. `features/tools/hub/types/tool.types.ts` — thêm giá trị vào union `ToolScreen`.
3. `runtime/tool-screens.tsx` — `dynamic(..., { ssr: false })` + một dòng trong `TOOL_SCREENS`.

Công cụ mới đặt trong feature riêng `features/tools/<nhóm>/`. Tắt một công cụ trên
production không cần sửa code: `NEXT_PUBLIC_TOOLS_OFF=<id>,<id>`.

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

## Ràng buộc nghiệp vụ

- **Tệp người dùng không bao giờ rời trình duyệt.** Lệnh mạng duy nhất của công cụ thường
  là bộ đếm lượt mở (gửi slug).
- Dữ liệu pháp lý / địa chỉ / lương / tiền điện chỉ được coi là "đã xác minh" khi đến từ
  gói quy tắc ký Ed25519 (`features/tools/rules/services/signed-rules.ts`, khoá
  `NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI`). Không có khoá → chỉ nhận tham số người dùng nhập.
  Không đưa số liệu trong archive vào như luật hiện hành.
- BYOAI: xem trước + che thông tin nhạy cảm trong prompt, chỉ gửi thay đổi người dùng
  chọn sau khi đồng ý; văn bản AI không bao giờ tự xuất bản.
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
| Phạm vi đã kiểm chứng | `docs/verification.md`, `docs/repo-split-verification.md` |
| Next.js 16 khác bản quen thuộc | `node_modules/next/dist/docs/` (xem `AGENTS.md`) |

Giữ tiếng Việt UTF-8 không BOM. Không commit / push khi chưa được yêu cầu rõ ràng.
