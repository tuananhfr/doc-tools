/** Theo dõi + huỷ một việc dài chạy từng trang (xuất PDF 500 trang, ảnh bản vẽ A0…). */
export interface WorkStep {
  signal?: AbortSignal
  /** `done` / `total` đơn vị (thường là trang) đã xử lý. */
  onProgress?: (done: number, total: number) => void
}

/**
 * Nhường luồng chính mỗi khi đã chạy liền quá `budgetMs`. pdf-lib chép trang
 * gần như đồng bộ — không nhường thì thanh tiến độ đứng im và nút Huỷ không
 * bấm được cho tới lúc xuất xong, tức là huỷ vô nghĩa.
 */
export function createPacer(
  budgetMs = 40,
  now: () => number = () => performance.now(),
  wait: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 0)),
) {
  let since = now()
  return async (signal?: AbortSignal): Promise<void> => {
    signal?.throwIfAborted()
    if (now() - since < budgetMs) return
    await wait()
    since = now()
    signal?.throwIfAborted()
  }
}
