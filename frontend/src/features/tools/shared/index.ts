/**
 * Tiện ích XỬ LÝ TỆP dùng chung cho mọi feature công cụ (`pdf/`, `image/`, `qr/`).
 * Tách khỏi `hub/` vì `hub/index.ts` nằm trên đường khởi động của app
 * (`routes/tools.routes.tsx` import tĩnh): thứ ở đây kéo thư viện (fflate) và chỉ
 * được nạp cùng chunk của từng công cụ. Không import feature nào khác, kể cả hub.
 */
export { detectImageFormat, HEADER_BYTES as IMAGE_HEADER_BYTES, isHeic, readImageSize } from './utils/image-header'
export type { ImageKind } from './utils/image-header'
export { attachJpegExif, exifForRedraw, readJpegExif } from './utils/jpeg-exif'
export { attachPngExif, readPngExif, readWebpExif } from './utils/png-webp-exif'
export { CanvasEncodeError, canvasToBlob, KEEP_QUALITY } from './utils/canvas-encode'
export type { CanvasMime } from './utils/canvas-encode'
export { stem, uniqueName, uniqueNames } from './utils/file-names'
export { createZipWriter, zipFiles } from './utils/zip'
export type { ZipEntry } from './utils/zip'
