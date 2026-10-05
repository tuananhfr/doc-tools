/**
 * Thoát khỏi một BẢN BUILD CŨ đang chạy trong tab — sau deploy.
 *
 * ============================================================================
 * VÌ SAO `location.reload()` MỘT MÌNH KHÔNG ĐỦ
 * ============================================================================
 * App là PWA chế độ `registerType: 'prompt'` (xem `vite.config.ts`): sau một
 * lần deploy, service worker MỚI cài xong rồi ĐỨNG CHỜ cho tới khi người dùng
 * bấm "Tải lại ngay" trên toast. Trong lúc chờ, SW CŨ vẫn giữ quyền và trả
 * `index.html` CŨ từ precache cho MỌI lần điều hướng — kể cả `reload()`.
 *
 * Triệu chứng đã gặp trên production (11/09/2026): vào màn Đề xuất ra trang 500
 * "Failed to fetch dynamically imported module: …/ProposalBoardPage-vd3voMgm.js".
 * Tên chunk đó thuộc bản build trước; CI deploy bằng `rsync --delete` nên nó đã
 * biến mất khỏi server, và nginx trả **200 + index.html** cho tệp không tồn tại
 * (nên trình duyệt báo lỗi MIME thay vì 404). `lazyRoute` nạp lại một lần —
 * SW cũ trả lại đúng index.html cũ — hỏng lại — cờ chống lặp chặn — trang 500.
 * Nút "Tải lại ứng dụng" cũng vậy. Người dùng kẹt tới khi đóng HẾT tab của app.
 *
 * Chế độ `prompt` có lý do (không reload giữa form đang nhập dở). Nhưng một lần
 * nạp chunk hỏng nghĩa là màn hình ĐÃ hỏng rồi — không còn form nào để giữ, nên
 * ở đúng lúc đó được phép ép SW mới lên.
 */

const SW_TIMEOUT_MS = 4000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ])
}

/**
 * Lỗi nạp chunk — mỗi trình duyệt một câu.
 *
 * Chrome/Edge: "Failed to fetch dynamically imported module"
 * Firefox:     "error loading dynamically imported module"
 * Safari:      "Importing a module script failed"
 * Vite:        "Unable to preload CSS for …" — tệp CSS đi kèm chunk không tải được
 *
 * `lazyRoute` dựa vào hàm này để phân biệt "không tải về được" (nạp lại trang
 * là cứu được) với "tải được nhưng chạy lỗi" (nạp lại vô ích): sót một câu ở
 * đây là ca đó mất đường tự cứu.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i.test(message)
}

/** SW đang chờ → kích hoạt, đợi nó nắm quyền. TRUE nếu đã có SW mới lên. */
async function activateWaitingWorker(registration: ServiceWorkerRegistration): Promise<boolean> {
  // Tab mở từ trước deploy có thể CHƯA hỏi lại sw.js lần nào — hỏi ngay.
  if (!registration.waiting && !registration.installing) {
    await withTimeout(registration.update().catch(() => undefined), SW_TIMEOUT_MS)
  }

  const installing = registration.installing
  if (!registration.waiting && installing) {
    await withTimeout(
      new Promise<void>((resolve) => {
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' || installing.state === 'redundant') resolve()
        })
      }),
      SW_TIMEOUT_MS,
    )
  }

  const waiting = registration.waiting
  if (!waiting) return false

  const changed = new Promise<void>((resolve) =>
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
  )
  // sw.js do Workbox sinh ra có sẵn listener `SKIP_WAITING` (chế độ prompt).
  waiting.postMessage({ type: 'SKIP_WAITING' })

  return (await withTimeout(changed.then(() => true), SW_TIMEOUT_MS)) ?? false
}

/**
 * Gỡ SW + xoá precache — đường cuối, để lần nạp kế đi thẳng ra mạng.
 *
 * Registration bị gỡ vẫn điều khiển trang HIỆN TẠI, nhưng lần điều hướng kế
 * tiếp không còn khớp nó (cờ uninstalling) nên lấy index.html mới từ server;
 * app mở lên thì `PwaUpdatePrompt` đăng ký lại SW từ đầu.
 *
 * Xoá cả cache vì precache có thể đã HỎNG chứ không chỉ cũ: SW cài trong lúc
 * CI đang rsync thì nhận 200 + index.html (fallback của nginx) cho những chunk
 * đã bị xoá, và cất HTML đó dưới tên tệp .js.
 */
async function resetServiceWorker(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  } catch {
    /* Không gỡ được thì thôi — vẫn thử xoá cache bên dưới. */
  }

  try {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('workbox-precache')).map((key) => caches.delete(key)))
  } catch {
    /* `caches` bị chặn (chế độ riêng tư): bỏ qua. */
  }
}

/**
 * Chuẩn bị cho một lần nạp lại lấy được BẢN MỚI. Gọi ngay trước `reload()`.
 *
 * 1. Có SW mới đang chờ → kích hoạt nó (cách êm nhất, giữ được offline cache).
 * 2. Không có mà trang vẫn đang do một SW điều khiển → precache của SW đó không
 *    có chunk cần thiết, tức nó cũ hoặc hỏng → gỡ hẳn.
 * 3. Trang không có SW → không làm gì, `reload()` thường đã lấy bản mới.
 *
 * KHÔNG gỡ khi đang offline: lúc đó chunk hỏng có thể chỉ vì mất mạng, gỡ SW là
 * lần nạp lại ra trang "không có kết nối" của trình duyệt thay vì app.
 */
export async function prepareReloadForNewBuild({ force = false } = {}): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    /*
     * `force`: người dùng tự bấm "Tải lại ứng dụng" trên trang lỗi — tức lần
     * nạp lại tự động đã thử và KHÔNG cứu được. Kích hoạt SW mới là chưa đủ nếu
     * chính precache của nó hỏng, nên gỡ hẳn luôn.
     */
    if (!force && (await activateWaitingWorker(registration))) return

    if (navigator.serviceWorker.controller && navigator.onLine !== false) {
      await resetServiceWorker()
    }
  } catch {
    /* Mọi bước ở đây là cố gắng thêm — hỏng thì `reload()` vẫn chạy như cũ. */
  }
}
