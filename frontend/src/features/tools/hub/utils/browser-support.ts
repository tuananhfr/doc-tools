/**
 * Trình duyệt này có chạy nổi pdf.js không — hỏi TRƯỚC khi nạp màn công cụ PDF.
 *
 * pdf.js v6 (bản thường, không phải `legacy/`) gọi thẳng các API dưới đây,
 * không kèm polyfill. Thiếu `Iterator` thì hỏng ngay lúc nạp chunk (Chrome 109,
 * bản cuối của Windows 7/8: `ReferenceError: Iterator is not defined`); thiếu
 * các API còn lại thì nạp được nhưng vỡ GIỮA CHỪNG, lúc người dùng đã thả tệp
 * vào. Hỏi trước thì cả hai ca đều ra một thông báo đọc được.
 *
 * Danh sách lấy từ `node_modules/pdfjs-dist/build/pdf{,.worker}.mjs` bản
 * 6.2.108 — NÂNG `pdfjs-dist` THÌ SOÁT LẠI: thừa một mục là chặn oan người dùng
 * được, thiếu một mục là người dùng vấp lỗi giữa chừng.
 */
type Scope = Record<string, unknown>

function method(owner: unknown, name: string): boolean {
  return owner != null && typeof (owner as Scope)[name] === 'function'
}

function prototypeOf(scope: Scope, name: string): unknown {
  return (scope[name] as { prototype?: unknown } | undefined)?.prototype
}

const PDF_ENGINE_CHECKS: Array<(scope: Scope) => boolean> = [
  (scope) => typeof scope.Iterator === 'function',
  (scope) => method(scope.Promise, 'withResolvers'),
  (scope) => method(scope.Promise, 'try'),
  (scope) => method(scope.URL, 'parse'),
  (scope) => method(scope.AbortSignal, 'any'),
  (scope) => method(scope.Math, 'sumPrecise'),
  (scope) => method(prototypeOf(scope, 'Map'), 'getOrInsertComputed'),
  (scope) => method(prototypeOf(scope, 'Uint8Array'), 'toHex'),
]

export function pdfEngineSupported(scope: object = globalThis): boolean {
  return PDF_ENGINE_CHECKS.every((check) => check(scope as Scope))
}
