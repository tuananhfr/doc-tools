# DocTools Backend

Repo độc lập cho API thống kê lượt mở, kho quy tắc có chữ ký và hàng chờ đóng góp của Chuyện Nhỏ, dùng NestJS, Fastify và MySQL/InnoDB. Tệp PDF/ảnh và nội dung công cụ vẫn được xử lý ở trình duyệt; chỉ nội dung người dùng chủ động gửi qua biểu mẫu đóng góp đi vào backend.

## Chạy local

Yêu cầu Node.js 24+, npm 11+ và MariaDB (hoặc MySQL tương thích). Chạy các lệnh ngay trong repo backend:

```sh
npm ci
npm run dev
```

Copy .env.example thành .env và điền thông tin database riêng cùng VISIT_HASH_SECRET ngẫu nhiên. Bản local hiện tại đã được cấu hình trong .env, file này được Git bỏ qua. Backend tạo các bảng cần thiết khi khởi động. API mặc định chạy ở http://127.0.0.1:3003.

npm run dev build TypeScript trước rồi theo dõi dist/main.js; sau khi sửa TypeScript cần chạy lại build. Chạy production bằng npm run build rồi npm run start. Repo backend cài, build và chạy riêng; frontend kết nối qua HTTP.

Repo có package-lock.json, node_modules và Git riêng. Chạy npm ci trong từng repo để cài đúng phiên bản đã khóa; không khai báo npm workspace hoặc liên kết package sang repo còn lại.

## Deploy

Trên server, backend chạy bằng service systemd `doc-tools-backend` (cổng 3003):

```sh
cd /var/www/doc-tools
git pull --ff-only origin main
cd backend
npm run deploy
```

Lệnh deploy chạy npm run build rồi gọi sudo systemctl restart doc-tools-backend chỉ khi build thành công. Nếu sudo yêu cầu mật khẩu, nhập mật khẩu của user server. Khi package.json hoặc package-lock.json thay đổi dependencies, chạy npm ci trong backend trước khi deploy. Bảng mới được tạo khi service khởi động, không cần migrate tay. Build ghi đè dist đang chạy; API gián đoạn ngắn khi restart. Kiểm tra sau deploy:

```sh
sudo systemctl status doc-tools-backend --no-pager -l
curl --retry 10 --retry-connrefused --retry-delay 1 -s http://127.0.0.1:3003/api/v1/tools/stats
```

Nếu service lỗi, xem log bằng `sudo journalctl -u doc-tools-backend -n 100 --no-pager`.

## Kho quy tắc có chữ ký

`GET /api/v1/rules/:kind` chỉ trả gói đang được kích hoạt, còn hiệu lực và xác minh được bằng khóa Ed25519 trong `RULE_SIGNING_PUBLIC_KEY_PEM`. Khi chưa cấu hình khóa, endpoint trả 503; khi chưa có gói cho loại đó, trả `{ "ok": true, "package": null }`. Dữ liệu trong kho không tự động được coi là văn bản hiện hành hay nguồn chính thức; người vận hành phải kiểm tra nguồn và ngày hiệu lực trước khi ký.

Gói JSON có `version`, `kind`, `keyId`, `effectiveFrom`, `effectiveTo` (tùy chọn), `publishedAt`, `source` (`title`, `url`, `retrievedAt`, `sha256`), `data`, `signature` (Ed25519 base64url). Chữ ký được tính trên JSON bỏ trường `signature`, với khóa object sắp theo thứ tự chữ cái ở mọi cấp. Khóa riêng phải nằm ngoài repo và ngoài ứng dụng web.

Sau khi build, người vận hành dùng `node dist/cli/rules.js stage package.json operator`, rồi `node dist/cli/rules.js activate kind:digest operator`. Lệnh `rollback kind:digest operator` chuyển về một gói đã lưu trước đó. Mọi thao tác có bản ghi trong `rule_audit`; nội dung gói trong `rule_packages` không bị ghi đè. Chỉ chạy các lệnh này trên máy chủ tin cậy với quyền truy cập database.

## Đóng góp và kiểm duyệt

`POST /api/v1/contributions` nhận thay đổi đã chọn và URL nguồn sau khi người dùng đồng ý gửi. API trả mã biên nhận 32 ký tự; `GET /api/v1/contributions/receipt/:code` chỉ cho biết trạng thái. Khi trạng thái là `NEEDS_SOURCE`, người giữ mã có thể gọi `POST /api/v1/contributions/receipt/:code/sources` để bổ sung URL HTTPS. Đóng góp ẩn danh được giới hạn 5 lần/giờ/IP bằng dấu HMAC, không lưu IP gốc. Đề xuất trùng bị từ chối. Đầu vào có email, token hoặc URL nội bộ trong nội dung thay đổi bị từ chối. Nội dung AI hoặc người dùng gửi không tự chuyển thành dữ liệu chính thức.

Người vận hành có thể xem bản ghi bằng `node dist/cli/contributions.js show <uuid>`, rồi dùng `verify <uuid> <reviewer> <note>`, `approve <uuid> <approver>` và `publish <uuid> <publisher> <digest>`. Ba người phải khác nhau. Với dữ liệu quy tắc, cần nguồn tham chiếu, ghi chú xác minh và gói đã ký được stage trước; lệnh publish kiểm tra chữ ký, ngày hiệu lực, kích hoạt gói và ghi audit trong một transaction. Đối với ý tưởng (`domain=ideas`), không cần nguồn hay digest; chỉ ý tưởng đã publish mới xuất hiện tại `GET /api/v1/contributions/ideas`. Có thêm `reject`, `supersede`, `revoke`. Các lệnh CLI chỉ chạy trên máy chủ tin cậy; danh tính operator hiện là tham số dòng lệnh, chưa nối với hệ thống định danh L3.

## API và kiểm chứng

- POST /api/v1/tools/visits nhận JSON {"tool":"ghep-pdf"}, trả {"ok":true}.
- GET /api/v1/tools/stats trả {"ok":true,"total":0,"tools":{}}.
- Giới hạn rolling 120 lượt/giờ/IP; vượt giới hạn vẫn trả ok nhưng không cộng. IP qua proxy loopback được nhận từ X-Forwarded-For; backend mặc định chỉ bind loopback.
- Database giữ bộ đếm và dấu IP HMAC tạm thời cho flood limit; không giữ raw IP hoặc tệp. Bảng contributions lưu nội dung đề xuất được gửi chủ động và nhật ký duyệt.
- npm test: build và test API với MySQL thật, bao gồm validation, đếm đồng thời và flood limit. Test tạo dữ liệu qa rồi dọn dữ liệu đó.
- npm run lint: kiểm tra TypeScript.

Chi tiết hợp đồng và triển khai ở docs/api.md. Đặt frontend, backend và database ở hạ tầng riêng khỏi ERPCons để cách ly tải.
