# DocTools — bản sao lưu tạm

Repo GitHub này lưu snapshot của frontend và backend để khôi phục code khi cần. Hai ứng dụng được phát triển trong hai repo local độc lập.

- [Frontend](frontend/README.md): Next.js + TypeScript.
- [Backend](backend/README.md): NestJS + Fastify + MySQL/InnoDB.

Mỗi ứng dụng có package.json, lockfile, dependencies và cấu hình riêng; chạy pnpm install/build/test trong thư mục tương ứng. Frontend kết nối backend qua HTTP. Thông tin snapshot và commit nguồn nằm trong backup.json.

Bản lưu giữ 737 file frontend và 22 file backend; 450 file feature DocTools được đối chiếu với manifest nguồn và giữ nguyên byte. Thư viện đã cài, thư mục build, ảnh QA và file .env của máy local được Git bỏ qua. Các file .env.example cung cấp mẫu cấu hình.
