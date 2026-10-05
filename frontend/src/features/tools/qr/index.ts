// Hai trang của feature được route nạp lười qua đường dẫn sâu (`pages/…`), không xuất ở đây.
export type { QrKind, ScanHit } from './types/qr.types'
// Hình học mã cho nơi khác tự vẽ (nhãn truy xuất của Kho): nhẹ, không kéo bwip-js / pdf-lib theo.
export { createMatrix, matrixPath, matrixSpan } from './utils/qr-matrix'
export { parseBarcodeSvg } from './utils/svg-paths'
export type { SvgPath } from './utils/svg-paths'
