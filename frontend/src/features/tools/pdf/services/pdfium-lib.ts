// Cửa riêng cho PDFium: chunk tải lười mang tên `pdfium-lib-*` — vite.config loại khỏi precache
// của service worker theo đúng tên này (chỉ người sửa chữ trong PDF mới cần tới nó).
export { init } from '@embedpdf/pdfium'
