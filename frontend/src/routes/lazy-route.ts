import { lazy } from 'react'
import type { ComponentType } from 'react'
import { isChunkLoadError, prepareReloadForNewBuild } from '@/utils/stale-build'

/**
 * `React.lazy` có THỬ LẠI — dùng cho mọi route của app.
 *
 * ============================================================================
 * VÌ SAO KHÔNG DÙNG `lazy()` TRẦN
 * ============================================================================
 * Triệu chứng: màn hình 500 với câu **"Failed to fetch dynamically imported
 * module: .../SomePage.tsx"**, và cách duy nhất thoát ra là bấm "Tải lại ứng
 * dụng".
 *
 * Đây KHÔNG phải lỗi của component — nó là chuyện mạng/triển khai:
 *
 * - **Production, và đây là ca nghiêm trọng nhất.** CI chạy
 *   `rsync -az --delete dist/`, tức tên chunk cũ **biến mất khỏi server** ngay
 *   khi deploy xong. Người dùng đang mở app giữ `index.html` cũ trong bộ nhớ;
 *   route kế tiếp họ bấm vào trỏ tới một chunk không còn tồn tại → 404 → toàn
 *   bộ màn hình thành trang lỗi. App có 154 route nạp trễ nên gần như thao tác
 *   nào sau một lần deploy cũng vấp.
 * - **Dev.** Sửa `vite.config.ts` làm dev server khởi động lại; request đang
 *   bay rơi vào đúng khoảng đó thì thất bại y hệt.
 * - Mạng chập chờn trên 3G/4G.
 *
 * ============================================================================
 * HAI BƯỚC, VÀ BƯỚC THỨ HAI MỚI LÀ THỨ CỨU ĐƯỢC NGƯỜI DÙNG
 * ============================================================================
 * 1. Thử lại MỘT lần sau 400 ms — đủ cho một lần rớt mạng thoáng qua hoặc một
 *    lần dev server khởi động lại.
 * 2. Vẫn hỏng thì **tải lại trang** (`location.reload()`), vì lúc này gần như
 *    chắc chắn là `index.html` trong tay người dùng đã cũ: nạp lại sẽ lấy bản
 *    mới cùng danh sách chunk mới. Chỉ thử lại mà không nạp lại thì sau deploy
 *    người dùng kẹt vĩnh viễn — chunk đó sẽ không bao giờ quay lại.
 *
 *    **Và phải ép service worker mới lên TRƯỚC khi nạp lại** (`prepareReloadForNewBuild`).
 *    App là PWA chế độ `prompt`: SW cũ giữ quyền tới khi người dùng bấm "Cập
 *    nhật", nên `reload()` trần nhận lại đúng index.html CŨ từ precache — hỏng
 *    lại, cờ chống lặp chặn, trang 500. Bản trước chỉ `reload()` và lỗi đó đã
 *    xảy ra trên production (11/09/2026, màn Đề xuất).
 *
 * **Phanh chống lặp vô hạn là bắt buộc.** Nếu bản mới cũng hỏng thật (lỗi build),
 * `reload()` sẽ quay vòng và trình duyệt không bao giờ dừng. Ghi GIỜ nạp lại vào
 * `sessionStorage`; vừa nạp lại trong `RELOAD_COOLDOWN_MS` thì **ném lỗi ra** cho
 * ErrorBoundary hiện trang 500 — một trang lỗi đọc được vẫn hơn một vòng lặp.
 *
 * Phanh là MỐC GIỜ, không phải một cờ được xoá khi "chunk nạp được". Cờ kiểu đó
 * đã hỏng hai lần, cùng một cách — có thứ nạp được và xoá nó trước khi thứ hỏng
 * kịp đọc: lần đầu là effect lúc khởi động app, lần hai là route lồng nhau
 * (`ToolRoutePage` nạp được → xoá cờ; màn công cụ bên trong không tải về được →
 * đặt cờ + reload → 18 lần / 10 giây, 02/10/2026). Mốc giờ tự hết hạn nên không
 * ai phải xoá, và mỗi phiên tab vẫn tự cứu được ở lần deploy sau.
 *
 * `sessionStorage` chứ không phải `localStorage`: dấu này chỉ có nghĩa trong
 * phiên tab hiện tại, và trình duyệt ở chế độ riêng tư có thể chặn cả hai nên
 * mọi truy cập đều bọc `try/catch`.
 */

/** Khoá giữ GIỜ (ms) của lần nạp lại gần nhất vì chunk không tải được. */
const RELOAD_FLAG = 'erp:chunk-reloaded'

/**
 * Trong khoảng này sau một lần tự nạp lại thì không tự nạp lại nữa.
 *
 * Phải dài hơn hẳn một vòng "tải trang → hỏng → nạp lại" trên mạng chậm, nếu
 * không vòng lặp chỉ chậm đi chứ không dừng. Cái giá: lần hỏng thứ hai trong 5
 * phút ra trang lỗi (có nút "Tải lại ứng dụng") thay vì tự nạp lại.
 */
const RELOAD_COOLDOWN_MS = 5 * 60_000

function reloadedRecently(): boolean {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_FLAG))
    return at > 0 && Date.now() - at < RELOAD_COOLDOWN_MS
  } catch {
    /* Chế độ riêng tư chặn storage: coi như CHƯA nạp lại. Một lần nạp thừa
       chấp nhận được; kẹt ở trang lỗi thì không. */
    return false
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    /* Không ghi được thì thôi — nhánh `reloadedRecently()` đã phòng sẵn. */
  }
}

/**
 * Gỡ phanh — CHỈ khi chính người dùng bấm "Tải lại ứng dụng" (`ErrorPage`).
 *
 * **ĐỪNG gọi ở bất cứ chỗ nào chạy tự động** (lúc khởi động app, sau khi một
 * chunk nạp được…): chỗ đó sẽ chạy trước khi chunk hỏng kịp đọc phanh, và trang
 * tự tải lại liên tục, không có thông báo lỗi nào. Đã vấp hai lần — xem đầu tệp.
 */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    /* Bỏ qua — xem `reloadedRecently()`. */
  }
}

const RETRY_DELAY_MS = 400

/**
 * Thay cho `lazy()` ở MỌI file `routes/*.routes.tsx`.
 *
 *     const TaskBoardPage = lazyRoute(() => import('@/features/.../TaskBoardPage'))
 *
 * Chữ ký giống hệt `lazy()` nên đổi chỗ dùng chỉ là đổi tên hàm.
 */
export function lazyRoute<P>(factory: () => Promise<{ default: ComponentType<P> }>) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (firstError) {
      /* CHI thu lai / nap lai khi chunk KHONG TAI VE DUOC. Chunk tai ve duoc
         nhung CHAY loi (vd pdf.js goi `Iterator` tren Chrome 109) thi nap lai bao
         nhieu lan cung ra dung loi do - nem thang cho ErrorBoundary.

         Truoc day moi loi deu di duong nap lai: cong cu PDF tren Chrome 109 quay
         vong ~2 lan/giay, nguoi dung chi thay "Dang tai..." (02/10/2026). */
      if (!isChunkLoadError(firstError)) throw firstError

      /* Cho mot nhip roi thu lai. Ly do that nam o lan thu hai. */
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

      try {
        return await factory()
      } catch (retryError) {
        /* Vừa nạp lại xong mà vẫn hỏng → bản mới hỏng thật. Ném ra cho
           ErrorBoundary, đừng quay vòng `reload()`. */
        if (reloadedRecently()) throw retryError

        markReloaded()

        /* `reload()` TRẦN không thoát được bản cũ khi app đang do service
           worker điều khiển: SW cũ trả lại index.html cũ từ precache, và chunk
           cần nạp vẫn không có. Phải ép SW mới lên (hoặc gỡ SW hỏng) TRƯỚC —
           xem `utils/stale-build.ts`. Đã gặp thật trên production 11/09/2026. */
        await prepareReloadForNewBuild()
        window.location.reload()

        /* `reload()` không dừng luồng hiện tại ngay lập tức. Trả về một Promise
           không bao giờ resolve để React giữ nguyên `Suspense` trong lúc trang
           đang bị thay — resolve/throw ở đây sẽ nháy một trang lỗi rồi mới nạp
           lại, người dùng thấy đúng thứ ta đang cố tránh. */
        return new Promise<never>(() => {})
      }
    }
  })
}
