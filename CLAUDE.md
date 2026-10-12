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

## Production

Từ 09/10/2026 site chạy ở **`https://chuyennho.tekshot.ai`** (basePath rỗng), server
srv774087 (69.62.73.66). Máy này dùng chung với ~20 site Apache khác — không cài nginx, không
restart MariaDB chung. Push `main` không deploy gì; người deploy tự kéo code trên server.

- Code ở `/var/www/doc-tools`, chạy bằng user `lpc`, Node 24.21.0 qua nvm ở
  `~/.nvm-doc-tools` (Node hệ thống là 14 — nạp nvm trước khi build). Deploy: `git pull` →
  `npm ci` khi lock đổi → `npm run deploy` trong từng thư mục (build rồi `sudo systemctl restart`).
- systemd `doc-tools-backend` (`127.0.0.1:3003`) và `doc-tools-frontend`
  (`next start --hostname localhost --port 3002`). Trên máy này `localhost` ra **`[::1]`**, nên
  vhost Apache trỏ `http://[::1]:3002`; trỏ `127.0.0.1:3002` là 503.
- Apache: `/etc/apache2/sites-available/chuyennho.tekshot.ai{,-le-ssl}.conf`. `/api/v1/mcp/`
  proxy **thẳng** sang 3003 (`flushpackets=on`, SSE — rewrite của Next không phủ đường này),
  còn lại sang 3002. Bản `-le-ssl` có `RequestHeader set X-Forwarded-Proto "https"`. Chứng chỉ
  certbot tự gia hạn.
- **MariaDB riêng trong Docker**: container `doctools-mariadb` (`mariadb:11.8`),
  `127.0.0.1:3307`, dữ liệu `/var/lib/doctools-mariadb`, mật khẩu root ở
  `/etc/doctools-mariadb.env`. Lý do: không có mật khẩu root của MariaDB chung, và reset nó là
  làm gián đoạn mọi site trên máy. Hệ quả:
  - `backend/.env` đặt `DB_HOST=127.0.0.1` + `DB_PORT=3307`. Client CLI cũng phải
    `-h127.0.0.1 -P3307`; `-hlocalhost` đi vào socket của MariaDB **chung** và báo access denied.
  - User app là `'doc_tools'@'%'` (quyền SELECT/INSERT/UPDATE/DELETE/CREATE/INDEX, như server cũ):
    kết nối đi qua cổng Docker nên tới container từ IP bridge, không phải localhost.
  - Lệnh quản trị: `docker exec -i doctools-mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" doc_tools'`.
  - Backup: `/etc/cron.d/doctools-mariadb-backup`, 2h sáng, `/var/backups/doctools`, giữ 14 ngày.
- `.env` của backend chép nguyên từ server cũ; **`CONFIG_ENCRYPTION_KEY` và `VISIT_HASH_SECRET`
  không được đổi** (mất bí mật đã lưu trong quản trị / lệch bộ đếm). Bí mật chỉ nằm trên server,
  không ghi vào repo.

### lpc.vn/doc-tools sau khi chuyển

lpc.vn vẫn ở server cũ srv931811 (nginx, `/etc/nginx/sites-available/lpc.vn`, khối `listen 443`).
Hai service Chuyện Nhỏ ở đó đã tắt; khối `# DocTools` chỉ còn bốn việc:

| Location | Việc | Bỏ đi thì |
| --- | --- | --- |
| `= /doc-tools` | Proxy trang giới thiệu `chuyennho.tekshot.ai/gioi-thieu/lpc` | Mất trang giới thiệu |
| `^~ /doc-tools/api/` | Proxy sang `chuyennho.tekshot.ai/api/` | **ERPCons** gọi `/doc-tools/api/v1/rules` cùng origin và backend không có CORS → công cụ tiền điện/lương/địa chỉ trong ERPCons mất bảng quy tắc |
| `= /doc-tools/sw.js` | Service worker tự gỡ (`return 200 "..."`) | Máy đã cài PWA cũ chạy mãi bản cache |
| `^~ /doc-tools/` | `rewrite … https://chuyennho.tekshot.ai/$1 permanent` | Link cũ / bookmark 404 |

Gắn trang giới thiệu vào website khác (từng bước + khối nginx đầy đủ của lpc.vn):
`frontend/docs/landing-host-proxy.md`.
