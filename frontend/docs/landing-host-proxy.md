# Gắn trang giới thiệu Chuyện Nhỏ vào website khác

Mỗi website ngành (văn phòng, gia đình, xây dựng…) hiện trang giới thiệu Chuyện Nhỏ của riêng
nó dưới một đường dẫn của chính nó, ví dụ `https://website-xay-dung.vn/chuyen-nho`. Website đó
chỉ cần **chuyển tiếp (reverse proxy) đúng một đường dẫn** tới Chuyện Nhỏ:

```
https://chuyennho.tekshot.ai/gioi-thieu/<mã trang>
```

Mã trang, chữ, ảnh, màu nhấn, logo, nền sáng/tối đặt ở **Quản trị › Trang giới thiệu**
(`/quan-tri/trang-gioi-thieu`). Trang chỉ trả lời sau khi đã **Xuất bản**.

> Trước 09/10/2026 Chuyện Nhỏ nằm ở `lpc.vn/doc-tools`. Cấu hình cũ trỏ
> `https://lpc.vn/doc-tools/gioi-thieu/...` phải đổi sang domain mới.

## Quy trình gắn một trang mới

1. **Tạo trang** trong Quản trị › Trang giới thiệu: đặt tên và mã trang (chữ thường, số, `-`;
   mã nằm trong URL). Trang mới điền sẵn chữ của landing văn phòng; sửa chữ, ảnh, màu, logo,
   sáng/tối, xem trước ở khung bên phải.
2. Điền ô **"Địa chỉ trang trên website gắn vào"** bằng địa chỉ đầy đủ trên website kia (ví dụ
   `https://website-xay-dung.vn/chuyen-nho`) để thẻ canonical ghi công cho website đó.
3. **Lưu bản nháp** → **Xuất bản**.
4. Kiểm phía Chuyện Nhỏ: `curl -s -o /dev/null -w '%{http_code}\n' https://chuyennho.tekshot.ai/gioi-thieu/<mã>`
   phải ra `200` (`404` = chưa xuất bản hoặc sai mã).
5. Trên website kia, thêm khối proxy theo loại máy chủ (các mục dưới). Thử trên một đường dẫn
   tạm trước (như đã làm với `lpc.vn/test`), ổn rồi mới chuyển sang đường dẫn thật.
6. Kiểm theo mục "Kiểm sau khi gắn" ở cuối.

Sửa chữ về sau chỉ cần sửa trong quản trị rồi Xuất bản lại; không đụng máy chủ website kia.

## Vì sao chỉ cần một đường dẫn

Trang trả về là một tệp HTML tự đủ:

- CSS nằm ngay trong trang, **không có JavaScript**.
- Mọi ảnh, font và liên kết là **URL tuyệt đối về `chuyennho.tekshot.ai`** (lấy từ
  `NEXT_PUBLIC_SITE_URL` lúc build). Website gắn trang không phải chuyển tiếp thêm `/_next`,
  `/api` hay thư mục ảnh nào.
- Font và ảnh tự gửi kèm header cho phép domain khác dùng (`Access-Control-Allow-Origin: *`
  cho font, `Cross-Origin-Resource-Policy: cross-origin` cho ảnh). Không phải sửa máy chủ
  Chuyện Nhỏ.
- Bấm vào công cụ thì người xem sang hẳn `chuyennho.tekshot.ai/...`. Tài khoản, Pro và AI chỉ
  có ở site Chuyện Nhỏ.

## Bộ nhớ đệm và độ trễ

| Trả lời của Chuyện Nhỏ | Ý nghĩa | Header |
| --- | --- | --- |
| 200 | Trang đã xuất bản | `Cache-Control: public, max-age=60, stale-while-revalidate=600` |
| 404 | Mã sai, chưa xuất bản hoặc đã gỡ | `no-store` |
| 503 | Chuyện Nhỏ tạm không đọc được dữ liệu | `no-store` |

Sửa xong bấm Xuất bản thì trang thật đổi sau khoảng **1 phút**, cộng thêm thời gian website
gắn trang tự cache. Mẫu nginx theo đúng `max-age=60`; các mẫu Cloudflare, Next và PHP cache
5 phút.

Nên cấu hình để khi Chuyện Nhỏ trả lỗi 5xx hoặc không trả lời, website gắn trang **vẫn phục vụ
bản cũ** đã cache (nginx: `proxy_cache_use_stale`). Trang 404 thì không nên cache lâu: gỡ
xuất bản phải có tác dụng.

## Việc cần làm cho mọi kiểu máy chủ

1. Gửi request tới `chuyennho.tekshot.ai` bằng **HTTPS**, với `Host: chuyennho.tekshot.ai` và
   SNI `chuyennho.tekshot.ai`. Không giữ Host của website mình.
2. **Không chuyển cookie** của website mình sang Chuyện Nhỏ: trang giới thiệu không cần, và đó
   là phiên đăng nhập của người xem ở site của bạn.
3. Chỉ chuyển **đúng một đường dẫn**. Không mở cả Chuyện Nhỏ qua site của bạn.

Trong các mẫu dưới, đổi `xay-dung` thành mã trang và `/chuyen-nho` thành đường dẫn bạn muốn.

## nginx

Bản tối thiểu (không cache) — đặt trong khối `server { }` **có `listen 443`** của website:

```nginx
location = /chuyen-nho {
    proxy_pass https://chuyennho.tekshot.ai/gioi-thieu/xay-dung;
    proxy_set_header Host chuyennho.tekshot.ai;
    proxy_ssl_server_name on;          # gửi SNI, thiếu dòng này handshake TLS có thể hỏng
    proxy_ssl_name chuyennho.tekshot.ai;
    proxy_set_header Cookie "";
    proxy_set_header Authorization "";
    proxy_hide_header Set-Cookie;
    proxy_connect_timeout 5s;
    proxy_read_timeout 10s;
}
location = /chuyen-nho/ { return 301 /chuyen-nho; }
```

`location = ...` là khớp chính xác nên nginx ưu tiên nó hơn mọi `location` khác (kể cả regex);
đặt ở đâu trong khối cũng được.

Muốn cache và giữ bản cũ khi Chuyện Nhỏ lỗi, thêm `proxy_cache_path` trong khối `http { }`
(một lần cho cả máy) và các dòng `proxy_cache*` vào `location`:

```nginx
# http { ... }
proxy_cache_path /var/cache/nginx/chuyen-nho levels=1:2 keys_zone=chuyen_nho:1m max_size=50m inactive=7d use_temp_path=off;

# trong location = /chuyen-nho { ... }
    proxy_cache chuyen_nho;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status always;
```

Kiểm cấu hình rồi nạp lại:

```bash
sudo mkdir -p /var/cache/nginx/chuyen-nho && sudo chown www-data /var/cache/nginx/chuyen-nho   # chỉ khi dùng cache
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://website-xay-dung.vn/chuyen-nho   # 200 (có cache: X-Cache-Status MISS rồi HIT)
```

nginx cache theo header của Chuyện Nhỏ: bản 200 giữ 60 giây, 404/503 (`no-store`) không cache.
Bản đã cache được giữ trên đĩa tới 7 ngày (`inactive=7d`) để `proxy_cache_use_stale` phục vụ
khi Chuyện Nhỏ lỗi. Muốn giữ lâu hơn 60 giây thì thêm `proxy_ignore_headers Cache-Control;` và
`proxy_cache_valid 200 5m;`.

## Apache 2.4

Cần `mod_proxy`, `mod_proxy_http`, `mod_ssl`, `mod_headers` (`a2enmod proxy proxy_http ssl headers`).
Trong `<VirtualHost *:443>` của website:

```apache
SSLProxyEngine on
SSLProxyCheckPeerName on

<Location "/chuyen-nho">
    ProxyPreserveHost Off               # Host gửi đi là chuyennho.tekshot.ai, không phải tên website này
    ProxyPass "https://chuyennho.tekshot.ai/gioi-thieu/xay-dung" timeout=10
    ProxyPassReverse "https://chuyennho.tekshot.ai/gioi-thieu/xay-dung"
    RequestHeader unset Cookie
    RequestHeader unset Authorization
    Header unset Set-Cookie
</Location>
```

**Website nằm cùng máy với Chuyện Nhỏ** (srv774087): trỏ thẳng vào frontend trong máy, khỏi đi
vòng qua HTTPS và không cần `SSLProxyEngine`. Frontend nghe ở `[::1]:3002` (không phải
`127.0.0.1`):

```apache
<Location "/chuyen-nho">
    ProxyPreserveHost Off
    ProxyPass "http://[::1]:3002/gioi-thieu/xay-dung" timeout=10
    ProxyPassReverse "http://[::1]:3002/gioi-thieu/xay-dung"
    RequestHeader unset Cookie
    RequestHeader unset Authorization
    Header unset Set-Cookie
</Location>
```

`<Location "/chuyen-nho">` khớp cả `/chuyen-nho/...` phía dưới. Phía Chuyện Nhỏ mọi đường dẫn
con đều ra 404, nên vẫn an toàn. Đặt khối này **trước** các `ProxyPass` sẵn có của vhost. Muốn
cache thì bật `mod_cache` + `mod_cache_disk` (`CacheEnable disk /chuyen-nho`,
`CacheStaleOnError on`).

Kiểm: `apachectl configtest && systemctl reload apache2`.

## Cloudflare (Worker)

Dùng khi website đứng sau Cloudflare. Tạo Worker, gắn **Route** `website-xay-dung.vn/chuyen-nho`
(đúng đường dẫn, không có `*`):

```js
const UPSTREAM = 'https://chuyennho.tekshot.ai/gioi-thieu/xay-dung'

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
    // A fresh request: the visitor's cookies for this site are not forwarded upstream.
    const upstream = await fetch(UPSTREAM, {
      method: request.method,
      headers: { accept: 'text/html' },
      cf: { cacheTtl: 300, cacheTtlByStatus: { '200-299': 300, '404': 60, '500-599': 0 } },
    })
    const response = new Response(upstream.body, upstream)
    response.headers.delete('set-cookie')
    return response
  },
}
```

Mẫu này không giữ bản cũ khi Chuyện Nhỏ lỗi: lúc đó khách thấy trang 503 của Chuyện Nhỏ. Cần
giữ bản cũ thì lưu bản 200 gần nhất vào Workers KV và trả bản đó khi upstream lỗi.

## Next.js (website dùng Next 13+ App Router)

Dùng route handler thay vì `rewrites()`. Rewrite ra domain ngoài sẽ chuyển cả cookie của
người xem sang Chuyện Nhỏ.

```ts
// app/chuyen-nho/route.ts
const UPSTREAM = 'https://chuyennho.tekshot.ai/gioi-thieu/xay-dung'

export const revalidate = 300

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'text/html; charset=utf-8',
        'cache-control': upstream.headers.get('cache-control') ?? 'no-store',
      },
    })
  } catch {
    return new Response('Tạm thời không mở được trang. Vui lòng thử lại sau.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
}
```

Website có `basePath` thì đường dẫn thật là `<basePath>/chuyen-nho`. Middleware đổi ngôn ngữ
hay đăng nhập (nếu có) phải bỏ qua đường dẫn này.

## PHP (hosting chia sẻ, không sửa được cấu hình máy chủ)

Tạo thư mục `chuyen-nho/` ở gốc website và đặt tệp `index.php`. Trang nằm ở `/chuyen-nho/`
(có dấu `/` cuối). Tệp tự cache 5 phút và **giữ bản cũ khi Chuyện Nhỏ lỗi**:

```php
<?php
// chuyen-nho/index.php
const UPSTREAM = 'https://chuyennho.tekshot.ai/gioi-thieu/xay-dung';
const TTL = 300;

$cache = sys_get_temp_dir() . '/chuyen-nho-' . md5(UPSTREAM) . '.html';
$fresh = is_file($cache) && time() - filemtime($cache) < TTL;

if (!$fresh) {
    $curl = curl_init(UPSTREAM);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Accept: text/html'],
    ]);
    $body = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

    if ($status === 200 && is_string($body)) {
        file_put_contents($cache . '.tmp', $body, LOCK_EX);
        rename($cache . '.tmp', $cache);
    } elseif ($status === 404) {
        // Unpublished: forget the old copy instead of showing it forever.
        @unlink($cache);
        http_response_code(404);
        exit('Không tìm thấy trang.');
    }
    // Any other failure falls through to the last good copy, if there is one.
}

if (!is_file($cache)) {
    http_response_code(503);
    exit('Tạm thời không mở được trang. Vui lòng thử lại sau.');
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=60');
readfile($cache);
```

Cần PHP có `curl`. Không cần `.htaccess`.

## Ví dụ thật: `lpc.vn/doc-tools` (nginx, server srv931811)

Đường dẫn cũ của chính Chuyện Nhỏ nên phức tạp hơn một website mới: ngoài trang giới thiệu còn
phải giữ API cho ERPCons và đưa người dùng cũ sang domain mới. Khối `# DocTools` trong
`/etc/nginx/sites-available/lpc.vn` (khối `listen 443`), thay cho các `location /doc-tools`
cũ trỏ vào cổng 3002:

```nginx
    # DocTools moved to chuyennho.tekshot.ai; lpc.vn keeps only the intro page,
    # the API that ERPCons calls same-origin, and redirects for old links.
    location = /doc-tools {
        proxy_pass https://chuyennho.tekshot.ai/gioi-thieu/lpc;
        proxy_set_header Host chuyennho.tekshot.ai;
        proxy_ssl_server_name on;
        proxy_ssl_name chuyennho.tekshot.ai;
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_hide_header Set-Cookie;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
    location = /doc-tools/ { return 301 /doc-tools; }

    location ^~ /doc-tools/api/ {
        proxy_pass https://chuyennho.tekshot.ai/api/;
        proxy_set_header Host chuyennho.tekshot.ai;
        proxy_ssl_server_name on;
        proxy_ssl_name chuyennho.tekshot.ai;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_hide_header Set-Cookie;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # Installed copies of the old PWA fetch this; it unregisters itself and reloads open tabs.
    location = /doc-tools/sw.js {
        default_type application/javascript;
        add_header Cache-Control "no-store" always;
        return 200 "self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(self.registration.unregister().then(function(){return self.clients.matchAll({type:'window'})}).then(function(cs){cs.forEach(function(c){c.navigate(c.url)})}))});";
    }

    location ^~ /doc-tools/ {
        rewrite ^/doc-tools/(.*)$ https://chuyennho.tekshot.ai/$1 permanent;
    }
```

| Khối | Vì sao cần |
| --- | --- |
| `= /doc-tools` | Trang giới thiệu, mã `lpc`, canonical `https://lpc.vn/doc-tools` |
| `^~ /doc-tools/api/` | ERPCons gọi `/doc-tools/api/v1/rules` **cùng origin**; backend Chuyện Nhỏ không có CORS nên không đổi được sang gọi thẳng domain mới. Bỏ khối này là công cụ tiền điện/lương/địa chỉ trong ERPCons mất bảng quy tắc |
| `= /doc-tools/sw.js` | Máy đã cài PWA cũ tải lại `sw.js` theo chu kỳ; bản này tự gỡ và tải lại tab, các tab rơi vào redirect sang domain mới |
| `^~ /doc-tools/` | Link cũ, bookmark, Google (`/doc-tools/vi/...`) sang đúng trang ở domain mới. `^~` để các `location` regex khác trong file (cache `.js`/`.png`…) không chen ngang |

Bản sao trước khi đổi: `/etc/nginx/sites-available/lpc.vn.backup-20261009-landing`.

Kiểm:

```bash
curl -s -o /dev/null -w 'landing %{http_code}\n' https://lpc.vn/doc-tools                    # 200
curl -s -o /dev/null -w 'api     %{http_code}\n' https://lpc.vn/doc-tools/api/v1/tools/stats  # 200
curl -sI https://lpc.vn/doc-tools/vi | grep -i '^location'      # https://chuyennho.tekshot.ai/vi
curl -s https://lpc.vn/doc-tools/sw.js | head -c 60; echo       # self.addEventListener...
```

## Kiểm sau khi gắn

- Mở `https://<website>/chuyen-nho`: thấy đủ ảnh, đúng font, đúng màu nhấn. DevTools ›
  Network không có request đỏ.
- `curl -s https://<website>/chuyen-nho | grep -c '<script'` ra `0`.
- Xem nguồn trang: `<link rel="canonical">` là địa chỉ trên website của bạn (nếu đã điền
  trong quản trị).
- Gỡ xuất bản trong quản trị: sau thời gian cache, đường dẫn trả 404.
