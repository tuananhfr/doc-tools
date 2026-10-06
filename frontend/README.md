# DocTools Frontend

Repo độc lập cho Chuyện Nhỏ công khai, dùng Next.js và TypeScript. Trang chủ ở /, mỗi công cụ ở /<slug>; khi NEXT_PUBLIC_BASE_PATH rỗng, URL /doc-tools cũ chuyển hướng về /. Khi cấu hình /doc-tools, trang chủ và công cụ nằm dưới prefix này. Công cụ cũ từ ERPCons được giữ ranh giới route/engine; công cụ mới theo docs nằm trong các feature riêng. Manifest đối chiếu ở docs/upstream-manifest.json; tài liệu nguồn ở docs/upstream và tiến độ tích hợp ở docs/chuyen-nho-implementation-map.md.

## Chạy local

Yêu cầu Node.js 24+ và npm 11+. Chạy các lệnh ngay trong repo frontend:

```sh
npm ci
npm run dev
```

Mở http://localhost:3002/. Chạy production bằng npm run build rồi npm run start.

Copy .env.example thành .env.local khi cần thay cấu hình. BACKEND_URL trỏ đến API NestJS đã triển khai riêng, mặc định http://127.0.0.1:3003. Next.js proxy <basePath>/api/v1/tools/*, rules/* và contributions/* tới địa chỉ này. NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI là khóa công khai Ed25519 dạng SPKI base64url để trình duyệt kiểm tra gói quy tắc; nếu trống, các công cụ liên quan chỉ nhận tham số người dùng tự nhập. NEXT_PUBLIC_SITE_URL là origin dùng cho canonical và sitemap; NEXT_PUBLIC_ERPCONS_URL dùng cho link đăng nhập/Pro. Biến NEXT_PUBLIC được chốt lúc build.

Repo có package-lock.json, node_modules và Git riêng. Chạy npm ci trong từng repo để cài đúng phiên bản đã khóa; không khai báo npm workspace hoặc liên kết package sang repo còn lại.

## Triển khai dưới đường dẫn con

Đặt trong .env.local trước khi build:

```dotenv
NEXT_PUBLIC_BASE_PATH=/doc-tools
NEXT_PUBLIC_SITE_URL=https://lpc.vn
BACKEND_URL=http://127.0.0.1:3003
```

Chạy npm run build rồi restart service frontend. Đổi base path cần build lại. Homepage /doc-tools chuyển hướng sang /doc-tools/ để nằm trong scope service worker; công cụ vẫn ở /doc-tools/<slug>. React Router giữ đường dẫn nội bộ / và dùng basename để tạo URL public. Service worker và cache được giới hạn theo prefix, tránh tác động ứng dụng khác trên cùng domain. Nginx proxy /doc-tools và /doc-tools/ tới http://127.0.0.1:3002 với proxy_pass không có dấu / cuối để giữ nguyên URI.

## Cập nhật trên server

Lệnh npm run deploy dành cho server Linux đã có service doc-tools-frontend và dependencies được cài. Chọn Node.js 24 trong môi trường riêng của DocTools trước khi chạy:

```sh
export NVM_DIR="$HOME/.nvm-doc-tools"
source "$NVM_DIR/nvm.sh" --no-use
nvm use 24.21.0

cd /var/www/doc-tools
git pull --ff-only origin main
cd frontend
npm run deploy
```

Lệnh deploy chạy npm run build, gồm build Next.js và tạo manifest offline, rồi gọi sudo systemctl restart doc-tools-frontend chỉ khi build thành công. Nếu sudo yêu cầu mật khẩu, nhập mật khẩu của user server. Nếu restart thất bại, lệnh deploy báo lỗi; xem log service để xử lý. Lệnh npm run build vẫn chỉ build như trước, không gọi systemd.

Khi package.json hoặc package-lock.json thay đổi dependencies, chạy npm ci trong frontend trước khi deploy. frontend/public/offline-manifest.json do build tự sinh và không nằm trong Git (đã gitignore), nên build không còn làm git pull bị chặn. Server nào còn bản cũ đang bị track thì lần pull đầu tiên sau thay đổi này chạy git restore -- frontend/public/offline-manifest.json từ /var/www/doc-tools trước, rồi pull và build lại.

Build ghi trực tiếp vào .next đang phục vụ, không giữ bản dự phòng. Build lỗi không restart service nhưng có thể ảnh hưởng file của bản đang chạy; cache không bảo đảm tránh tình huống này. Frontend có gián đoạn ngắn khi restart. Kiểm tra sau deploy:

```sh
sudo systemctl status doc-tools-frontend --no-pager -l
curl --retry 10 --retry-connrefused --retry-delay 1 -I http://127.0.0.1:3002/doc-tools/
```

Nếu service lỗi:

```sh
sudo journalctl -u doc-tools-frontend -n 80 --no-pager
```

## Kiểm chứng

Bốn công cụ video Free (`/nen-video`, `/cat-video`, `/tao-gif`, `/tach-am-thanh`) dùng FFmpeg GPL chạy cục bộ trong worker. `npm ci`, `npm run dev` và `npm run build` tự chuẩn bị tài nguyên ở `public/vendor/ffmpeg/`; lần đầu xử lý cần tải khoảng 32 MB. Xem [docs/video-engine.md](docs/video-engine.md) để biết giới hạn thiết bị, chế độ offline, giấy phép và nguồn/build upstream.

- npm test: test logic thuần.
- npm run build: build Next.js và manifest offline.
- npm run lint: kiểm tra TypeScript.
- node scripts/doc-tools/make-fixtures.mjs: tạo tệp mẫu trong thư mục tạm.
- Các script scripts/doc-tools/check-*.mjs và golden.mjs đọc BASE và PLAYWRIGHT_DIR. Đặt BASE=http://localhost:3002/chinh-sua-pdf để kiểm nhánh Free.
- scripts/verify-parity.mjs và scripts/verify-extra.mjs so với ERPCons đang chạy ở port 3000; cần Chrome và Playwright có sẵn. Kết quả mặc định vào qa-output của repo, có thể đổi bằng QA_OUT.

Repo giữ data router React Router bên trong Next.js để bảo toàn handoff, screen identity và cảnh báo rời trang. Engine chạy trong trình duyệt; tệp người dùng không tải lên API. Nội dung đề xuất chỉ được gửi khi người dùng xem và đồng ý gửi qua màn BYOAI/góp ý. Lịch Gia Đình V1 lưu ở IndexedDB trên thiết bị, có sao lưu/ICS/in; chưa có đồng bộ hay chia sẻ qua mạng. Bản Free dùng link đăng nhập/Pro của ERPCons, chưa có tài khoản L2 local. Xem docs/verification.md để biết phạm vi kiểm chứng lần copy đầu tiên và docs/chuyen-nho-implementation-map.md cho các phần của tài liệu mới chưa hoàn tất.
