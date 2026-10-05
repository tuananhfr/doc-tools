# DocTools Frontend

Repo độc lập cho DocTools công khai Free, dùng Next.js và TypeScript. Trang chủ ở /, mỗi công cụ ở /<slug>; Khi NEXT_PUBLIC_BASE_PATH rỗng, URL /doc-tools cũ chuyển hướng về /. Khi cấu hình /doc-tools, trang chủ và công cụ nằm dưới prefix này. Code feature, UI, text và engine được giữ nguyên từ ERPCons. Manifest đối chiếu ở docs/upstream-manifest.json; tài liệu nguồn ở docs/upstream.

## Chạy local

Yêu cầu Node.js 24+ và npm 11+. Chạy các lệnh ngay trong repo frontend:

```sh
npm ci
npm run dev
```

Mở http://localhost:3002/. Chạy production bằng npm run build rồi npm run start.

Copy .env.example thành .env.local khi cần thay cấu hình. BACKEND_URL trỏ đến API NestJS đã triển khai riêng, mặc định http://127.0.0.1:3003. Next.js proxy <basePath>/api/v1/tools/* tới địa chỉ này; backend vẫn dùng /api/v1/tools/*. NEXT_PUBLIC_SITE_URL là origin (ví dụ https://lpc.vn) dùng cho canonical và sitemap; NEXT_PUBLIC_ERPCONS_URL dùng cho link đăng nhập/Pro. Biến NEXT_PUBLIC được chốt lúc build. Repo frontend chỉ cần địa chỉ HTTP của backend để kết nối API.

Repo có package-lock.json, node_modules và Git riêng. Chạy npm ci trong từng repo để cài đúng phiên bản đã khóa; không khai báo npm workspace hoặc liên kết package sang repo còn lại.

## Triển khai dưới đường dẫn con

Đặt trong .env.local trước khi build:

```dotenv
NEXT_PUBLIC_BASE_PATH=/doc-tools
NEXT_PUBLIC_SITE_URL=https://lpc.vn
BACKEND_URL=http://127.0.0.1:3003
```

Chạy npm run build rồi restart service frontend. Đổi base path cần build lại. Homepage /doc-tools chuyển hướng sang /doc-tools/ để nằm trong scope service worker; công cụ vẫn ở /doc-tools/<slug>. React Router giữ đường dẫn nội bộ / và dùng basename để tạo URL public. Service worker và cache được giới hạn theo prefix, tránh tác động ứng dụng khác trên cùng domain. Nginx proxy /doc-tools và /doc-tools/ tới http://127.0.0.1:3002 với proxy_pass không có dấu / cuối để giữ nguyên URI.

## Kiểm chứng

- npm test: test logic thuần.
- npm run build: build Next.js và manifest offline.
- npm run lint: kiểm tra TypeScript.
- node scripts/doc-tools/make-fixtures.mjs: tạo tệp mẫu trong thư mục tạm.
- Các script scripts/doc-tools/check-*.mjs và golden.mjs đọc BASE và PLAYWRIGHT_DIR. Đặt BASE=http://localhost:3002/chinh-sua-pdf để kiểm nhánh Free.
- scripts/verify-parity.mjs và scripts/verify-extra.mjs so với ERPCons đang chạy ở port 3000; cần Chrome và Playwright có sẵn. Kết quả mặc định vào qa-output của repo, có thể đổi bằng QA_OUT.

Repo giữ data router React Router bên trong Next.js để bảo toàn handoff, screen identity và cảnh báo rời trang. Engine chạy trong trình duyệt; tệp người dùng không tải lên API. Bản Free dùng link đăng nhập/Pro của ERPCons, không có tài khoản local. Xem docs/verification.md để biết phạm vi kiểm chứng lần copy đầu tiên.
