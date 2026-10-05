# DocTools Backend

Repo độc lập cho API thống kê lượt mở của DocTools, dùng NestJS, Fastify và MySQL/InnoDB. Tệp PDF/ảnh và nội dung công cụ được xử lý ở trình duyệt; backend hiện chỉ đếm lượt.

## Chạy local

Yêu cầu Node.js 24+, pnpm 11.19.0 và MySQL 8.4. Chạy các lệnh ngay trong repo backend:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Copy .env.example thành .env và điền thông tin database riêng cùng VISIT_HASH_SECRET ngẫu nhiên. Bản local hiện tại đã được cấu hình trong .env, file này được Git bỏ qua. Backend tự tạo ba bảng khi khởi động. API mặc định chạy ở http://127.0.0.1:3003.

pnpm dev build TypeScript trước rồi theo dõi dist/main.js; sau khi sửa TypeScript cần chạy lại build. Chạy production bằng pnpm build rồi pnpm start. Repo backend cài, build và chạy riêng; frontend kết nối qua HTTP.

pnpm-workspace.yaml chỉ chứa chính sách chạy build script của dependencies cho ứng dụng này; không khai báo hay liên kết package ở repo khác. Repo có lockfile, node_modules và Git riêng.

## API và kiểm chứng

- POST /api/v1/tools/visits nhận JSON {"tool":"ghep-pdf"}, trả {"ok":true}.
- GET /api/v1/tools/stats trả {"ok":true,"total":0,"tools":{}}.
- Giới hạn rolling 120 lượt/giờ/IP; vượt giới hạn vẫn trả ok nhưng không cộng. IP qua proxy loopback được nhận từ X-Forwarded-For; backend mặc định chỉ bind loopback.
- Database giữ bộ đếm và dấu IP HMAC tạm thời cho flood limit; không giữ raw IP, tệp hay nội dung công cụ.
- pnpm test: build và test API với MySQL thật, bao gồm validation, đếm đồng thời và flood limit. Test tạo dữ liệu qa rồi dọn dữ liệu đó.
- pnpm lint: kiểm tra TypeScript.

Chi tiết hợp đồng và triển khai ở docs/api.md. Đặt frontend, backend và database ở hạ tầng riêng khỏi ERPCons để cách ly tải.
