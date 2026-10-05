# DocTools — bản sao lưu tạm

Repo GitHub này lưu snapshot của frontend và backend để khôi phục code khi cần. Hai ứng dụng được phát triển trong hai repo local độc lập.

- [Frontend](frontend/README.md): Next.js + TypeScript.
- [Backend](backend/README.md): NestJS + Fastify + MySQL/InnoDB.

Mỗi ứng dụng có package.json, lockfile, dependencies và cấu hình riêng; chạy pnpm install/build/test trong thư mục tương ứng. Frontend kết nối backend qua HTTP. Thông tin snapshot và commit nguồn nằm trong backup.json.

Snapshot hiện tại gồm trang chủ ở /, danh mục /cong-cu, giao diện Chuyện Nhỏ và các công cụ đã copy từ ERPCons. Số file, commit nguồn và dấu kiểm tra nội dung nằm trong backup.json; snapshot có cả thay đổi chưa commit ở repo nguồn. Thư viện đã cài, thư mục build, ảnh QA, file .env của máy local và thư mục /docs ở ngoài hai source được Git bỏ qua. Các file .env.example cung cấp mẫu cấu hình.
