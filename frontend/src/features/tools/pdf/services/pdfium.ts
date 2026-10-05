import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import type { WrappedPdfiumModule } from '@embedpdf/pdfium'

/** Phần runtime Emscripten dùng tới — gói không kèm kiểu `EmscriptenModule`. */
interface PdfiumRuntime {
  HEAPU8: Uint8Array
  wasmExports: { malloc: (size: number) => number; free: (ptr: number) => void }
  getValue: (ptr: number, type: 'float') => number
}

export interface Pdfium {
  api: WrappedPdfiumModule
  alloc: (size: number) => number
  /** Chép `bytes` vào bộ nhớ WASM; nơi gọi tự `free`. */
  put: (bytes: Uint8Array) => number
  free: (ptr: number) => void
  /** Gọi hàm C ghi `count` số float ra con trỏ rồi đọc lại. */
  floats: (count: number, fill: (ptr: number) => unknown) => number[]
  /** Như `floats` nhưng cho số nguyên 32 bit (cờ, `FPDF_BOOL`). */
  ints: (count: number, fill: (ptr: number) => unknown) => number[]
  /** Đọc `size` byte từ bộ nhớ WASM thành mảng riêng. */
  take: (ptr: number, size: number) => Uint8Array<ArrayBuffer>
}

let engine: Promise<Pdfium> | null = null

async function start(): Promise<Pdfium> {
  const [{ init }, response] = await Promise.all([import('./pdfium-lib'), fetch(wasmUrl)])
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const api = await init({ wasmBinary: await response.arrayBuffer() })
  api.PDFiumExt_Init()
  const runtime = api.pdfium as unknown as PdfiumRuntime
  const { malloc, free } = runtime.wasmExports
  return {
    api,
    alloc: malloc,
    free,
    // `HEAPU8` phải đọc lại mỗi lần: bộ nhớ WASM lớn thêm là mảng cũ mất hiệu lực.
    put: (bytes) => {
      const ptr = malloc(bytes.length)
      runtime.HEAPU8.set(bytes, ptr)
      return ptr
    },
    floats: (count, fill) => {
      const ptr = malloc(count * 4)
      try {
        fill(ptr)
        return Array.from({ length: count }, (_, index) => runtime.getValue(ptr + index * 4, 'float'))
      } finally {
        free(ptr)
      }
    },
    ints: (count, fill) => {
      const ptr = malloc(count * 4)
      try {
        fill(ptr)
        const view = new DataView(runtime.HEAPU8.buffer, runtime.HEAPU8.byteOffset + ptr, count * 4)
        return Array.from({ length: count }, (_, index) => view.getInt32(index * 4, true))
      } finally {
        free(ptr)
      }
    },
    take: (ptr, size) => runtime.HEAPU8.slice(ptr, ptr + size),
  }
}

/**
 * PDFium (C++) dựng sang WASM, nạp khi lần đầu sửa chữ (~4,6 MB, không vào
 * precache của SW). Khác qpdf, một instance dùng lại được cho mọi lần gọi.
 */
export function loadPdfium(): Promise<Pdfium> {
  if (!engine) {
    const pending = start()
    // Lỗi mạng thì bỏ để lần sửa sau thử tải lại.
    pending.catch(() => {
      if (engine === pending) engine = null
    })
    engine = pending
  }
  return engine
}
