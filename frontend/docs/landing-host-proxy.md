# Gắn trang giới thiệu Chuyện Nhỏ vào website khác

Mỗi website ngành (văn phòng, gia đình, xây dựng…) hiện trang giới thiệu Chuyện Nhỏ của riêng
nó dưới một đường dẫn của chính nó, ví dụ `https://website-xay-dung.vn/chuyen-nho`. Website đó
chỉ cần **chuyển tiếp (reverse proxy) đúng một đường dẫn** tới DocTools:

```
https://lpc.vn/doc-tools/gioi-thieu/<mã trang>
```

Mã trang, chữ, ảnh, màu nhấn, logo, nền sáng/tối đặt ở **Quản trị › Trang giới thiệu**
(`/quan-tri/trang-gioi-thieu`). Trang chỉ trả lời sau khi đã **Xuất bản**.

## Vì sao chỉ cần một đường dẫn

Trang trả về là một tệp HTML tự đủ:

- CSS nằm ngay trong trang, **không có JavaScript**.
- Mọi ảnh, font và liên kết là **URL tuyệt đối về lpc.vn**. Website gắn trang không phải
  chuyển tiếp thêm `/_next`, `/api` hay thư mục ảnh nào.
- Font và ảnh tự gửi kèm header cho phép domain khác dùng (`Access-Control-Allow-Origin: *`
  cho font, `Cross-Origin-Resource-Policy: cross-origin` cho ảnh). Không phải sửa nginx của
  lpc.vn.
- Bấm vào công cụ thì người xem sang hẳn `lpc.vn/doc-tools/...`. Tài khoản, Pro và AI chỉ có
  ở site DocTools.

## Bộ nhớ đệm và độ trễ

| Trả lời của DocTools | Ý nghĩa | Header |
| --- | --- | --- |
| 200 | Trang đã xuất bản | `Cache-Control: public, max-age=60, stale-while-revalidate=600` |
| 404 | Mã sai, chưa xuất bản hoặc đã gỡ | `no-store` |
| 503 | DocTools tạm không đọc được dữ liệu | `no-store` |

Sửa xong bấm Xuất bản thì trang thật đổi sau khoảng **1 phút**, cộng thêm thời gian website
gắn trang tự cache. Mẫu nginx theo đúng `max-age=60` của DocTools; các mẫu Cloudflare, Next và
PHP cache 5 phút.

Nên cấu hình để khi DocTools trả lỗi 5xx hoặc không trả lời, website gắn trang **vẫn phục vụ
bản cũ** đã cache (nginx: `proxy_cache_use_stale`). Trang 404 thì không nên cache lâu: gỡ
xuất bản phải có tác dụng.

## Việc cần làm cho mọi kiểu máy chủ

1. Gửi request tới `lpc.vn` bằng **HTTPS**, với `Host: lpc.vn` và SNI `lpc.vn`. Không giữ Host
   của website mình.
2. **Không chuyển cookie** của website mình sang lpc.vn: trang giới thiệu không cần, và đó là
   phiên đăng nhập của người xem ở site của bạn.
3. Chỉ chuyển **đúng một đường dẫn**. Không mở cả `lpc.vn` qua site của bạn.
4. Điền ô **"Địa chỉ trang trên website gắn vào"** trong quản trị bằng địa chỉ đầy đủ (ví dụ
   `https://website-xay-dung.vn/chuyen-nho`), để thẻ canonical ghi công cho website của bạn.

Trong các mẫu dưới, đổi `xay-dung` thành mã trang và `/chuyen-nho` thành đường dẫn bạn muốn.

## nginx

Đặt `proxy_cache_path` trong khối `http { }` (một lần cho cả máy), phần `location` trong
`server { }` của website:

```nginx
# http { ... }
proxy_cache_path /var/cache/nginx/chuyen-nho levels=1:2 keys_zone=chuyen_nho:1m max_size=50m inactive=7d use_temp_path=off;

# server { ... }
location = /chuyen-nho {
    proxy_pass https://lpc.vn/doc-tools/gioi-thieu/xay-dung;
    proxy_set_header Host lpc.vn;
    proxy_ssl_server_name on;          # gửi SNI lpc.vn, thiếu dòng này handshake TLS có thể hỏng
    proxy_ssl_name lpc.vn;
    proxy_set_header Cookie "";
    proxy_set_header Authorization "";
    proxy_hide_header Set-Cookie;
    proxy_connect_timeout 5s;
    proxy_read_timeout 10s;

    proxy_cache chuyen_nho;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status always;
}

# Tuỳ chọn: /chuyen-nho/ (có dấu / cuối) về cùng một trang
location = /chuyen-nho/ { return 301 /chuyen-nho; }
```

Kiểm cấu hình rồi nạp lại:

```bash
sudo mkdir -p /var/cache/nginx/chuyen-nho && sudo chown www-data /var/cache/nginx/chuyen-nho
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://website-xay-dung.vn/chuyen-nho   # 200, X-Cache-Status: MISS rồi HIT
```

nginx cache theo header của DocTools: bản 200 giữ 60 giây, 404/503 (`no-store`) không cache.
Bản đã cache được giữ trên đĩa tới 7 ngày (`inactive=7d`) để `proxy_cache_use_stale` phục vụ
khi lpc.vn lỗi. Muốn giữ lâu hơn 60 giây thì thêm `proxy_ignore_headers Cache-Control;` và
`proxy_cache_valid 200 5m;`. Không dùng cache thì bỏ các dòng `proxy_cache*`, trang vẫn chạy.

## Apache 2.4

Cần `mod_proxy`, `mod_proxy_http`, `mod_ssl`, `mod_headers` (`a2enmod proxy proxy_http ssl headers`).
Trong `<VirtualHost>` của website:

```apache
SSLProxyEngine on
SSLProxyCheckPeerName on
ProxyPreserveHost Off               # Host gửi đi là lpc.vn, không phải tên website này

<Location "/chuyen-nho">
    ProxyPass "https://lpc.vn/doc-tools/gioi-thieu/xay-dung" timeout=10
    ProxyPassReverse "https://lpc.vn/doc-tools/gioi-thieu/xay-dung"
    RequestHeader unset Cookie
    RequestHeader unset Authorization
    Header unset Set-Cookie
</Location>
```

`<Location "/chuyen-nho">` khớp cả `/chuyen-nho/...` phía dưới. Phía DocTools mọi đường dẫn
con đều ra 404, nên vẫn an toàn. Muốn cache thì bật `mod_cache` + `mod_cache_disk`
(`CacheEnable disk /chuyen-nho`, `CacheStaleOnError on`). Không cache thì trang vẫn chạy, chỉ
mỗi lượt xem gọi sang lpc.vn một lần.

Kiểm: `apachectl configtest && systemctl reload apache2`.

## Cloudflare (Worker)

Dùng khi website đứng sau Cloudflare. Tạo Worker, gắn **Route** `website-xay-dung.vn/chuyen-nho`
(đúng đường dẫn, không có `*`):

```js
const UPSTREAM = 'https://lpc.vn/doc-tools/gioi-thieu/xay-dung'

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
    // A fresh request: the visitor's cookies for this site are not forwarded to lpc.vn.
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

Mẫu này không giữ bản cũ khi DocTools lỗi: lúc đó khách thấy trang 503 của DocTools. Cần giữ
bản cũ thì lưu bản 200 gần nhất vào Workers KV và trả bản đó khi upstream lỗi.

## Next.js (website dùng Next 13+ App Router)

Dùng route handler thay vì `rewrites()`. Rewrite ra domain ngoài sẽ chuyển cả cookie của
người xem sang lpc.vn.

```ts
// app/chuyen-nho/route.ts
const UPSTREAM = 'https://lpc.vn/doc-tools/gioi-thieu/xay-dung'

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
(có dấu `/` cuối). Tệp tự cache 5 phút và **giữ bản cũ khi lpc.vn lỗi**:

```php
<?php
// chuyen-nho/index.php
const UPSTREAM = 'https://lpc.vn/doc-tools/gioi-thieu/xay-dung';
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

## Kiểm sau khi gắn

- Mở `https://<website>/chuyen-nho`: thấy đủ ảnh, đúng font, đúng màu nhấn. DevTools ›
  Network không có request đỏ.
- `curl -s https://<website>/chuyen-nho | grep -c '<script'` ra `0`.
- Xem nguồn trang: `<link rel="canonical">` là địa chỉ trên website của bạn (nếu đã điền
  trong quản trị).
- Gỡ xuất bản trong quản trị: sau thời gian cache, đường dẫn trả 404.
