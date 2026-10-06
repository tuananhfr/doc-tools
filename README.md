# DocTools

Repo chung của Chuyện Nhỏ (DocTools), gồm hai ứng dụng độc lập về code:

- [Frontend](frontend/README.md): Next.js + TypeScript.
- [Backend](backend/README.md): NestJS + Fastify + MySQL/InnoDB.

Mỗi ứng dụng có package.json, lockfile, dependencies và cấu hình riêng; chạy npm ci, npm run build và npm test trong thư mục tương ứng. Frontend kết nối backend qua HTTP. Không có npm workspace hay dependency dùng chung giữa hai thư mục.

Thư viện đã cài, thư mục build, ảnh QA, file .env của máy local, thư mục /docs ở gốc và FFmpeg do build tự sinh (frontend/public/vendor/ffmpeg) được Git bỏ qua. Các file .env.example cung cấp mẫu cấu hình. backup.json ghi lại snapshot cuối cùng từ thời hai thư mục còn là hai repo local riêng.
