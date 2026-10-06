# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Thư mục này là repo Git chung `doc-tools` (GitHub `tuananhfr/doc-tools`, nhánh `main`),
không có `package.json`. Hai ứng dụng là hai thư mục con độc lập về code — vào đúng thư
mục rồi đọc `CLAUDE.md` của nó trước khi làm. Lịch sử Git riêng cũ của hai thư mục (trước
06/10/2026) cất ở `G:\workspace\doc-tools-git-backup\`.

| Thư mục | Stack | Cổng dev | Đọc |
| --- | --- | --- | --- |
| `frontend/` | Next.js 16 + React Router, chạy công cụ trong trình duyệt | 3002 | `frontend/CLAUDE.md` |
| `backend/` | NestJS 12 + Fastify + MySQL (`doc_tools`) | 3003 | `backend/CLAUDE.md` |

- Chạy `npm ci` / `npm test` / `npm run build` / `npm run lint` **trong từng thư mục**. Không
  thêm npm workspace hay dependency `file:` nối hai app; chúng chỉ nói chuyện qua HTTP
  (frontend rewrite `/api/v1/{tools,rules,contributions}` sang `BACKEND_URL`).
- `docs/` ở đây (gitignore) là bộ tài liệu gốc: spec `.docx`, archive mã nguồn
  Chuyện Nhỏ (`*.zip`), `UI-UX/`. Archive chỉ là tham chiếu chức năng — không chép nguyên
  đường dẫn, khoá, cách lưu trữ hay dữ liệu pháp lý/giá vào production. Bản đồ archive →
  code hiện tại ở `frontend/docs/chuyen-nho-implementation-map.md`.
- Spec gốc DocTools (24 tài liệu) nằm ngoài cả hai repo:
  `C:\Users\admin\Downloads\ERPCons DocTools\`.
