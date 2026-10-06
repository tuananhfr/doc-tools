import { withBase } from './url'

/**
 * Thư mục bộ giải mã WASM của pdf.js (do `scripts/prepare-pdfjs.mjs` chép vào `public/`).
 * Thiếu `wasmUrl` thì pdf.js không giải được ảnh CCITT / JBIG2 / JPEG 2000 — bản scan
 * văn bản hành chính vẽ ra trang TRẮNG, không lỗi nào hiện ra. Tuyệt đối vì worker
 * của pdf.js tự fetch, không theo URL của trang.
 */
export function pdfjsWasmUrl(version: string): string {
  return new URL(withBase(`/vendor/pdfjs/${version}/`), window.location.href).href
}
