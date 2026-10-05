import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'

export interface QpdfResult {
  /** 0 = xong, 3 = xong kèm cảnh báo, 2 = lỗi (sai mật khẩu, tệp hỏng…). */
  code: number
  stdout: string[]
  /** Nội dung `/out.pdf` khi lệnh có ghi ra. */
  output: Uint8Array<ArrayBuffer> | null
}

/** Chạy qpdf với `input` ở `/in.pdf`; lệnh muốn ghi ra thì ghi `/out.pdf`. */
export type QpdfRun = (args: string[], input: Uint8Array) => Promise<QpdfResult>

interface QpdfInstance {
  callMain(args: string[]): number
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array }
}

type CreateQpdf = (options: { locateFile: () => string; noInitialRun: boolean; thisProgram: string }) => Promise<QpdfInstance>

export const QPDF_OK = (code: number) => code === 0 || code === 3

/**
 * qpdf (C++) dựng sang WASM, nạp khi cần (~1,3 MB, không vào precache của SW).
 * Mỗi lần chạy một instance mới: `callMain` lần hai trên cùng instance mang
 * theo trạng thái tĩnh của lần trước.
 */
export function createQpdfRunner(wasmLocation: string): QpdfRun {
  return async (args, input) => {
    const { default: createQpdf } = (await import('@neslinesli93/qpdf-wasm')) as unknown as { default: CreateQpdf }
    const stdout: string[] = []
    const { log, error } = console
    // Bản build tối giản không nhận hook print/printErr: nó bind console.log /
    // console.error NGAY lúc tạo module (đồng bộ). Tráo trong đúng khoảnh khắc
    // đó là bắt được stdout (--show-encryption) và nuốt "invalid password".
    console.log = (...parts: unknown[]) => void stdout.push(parts.join(' '))
    console.error = () => undefined
    let pending: Promise<QpdfInstance>
    try {
      pending = createQpdf({ locateFile: () => wasmLocation, noInitialRun: true, thisProgram: 'qpdf' })
    } finally {
      console.log = log
      console.error = error
    }
    const qpdf = await pending
    qpdf.FS.writeFile('/in.pdf', input)
    let code: number
    try {
      code = qpdf.callMain(args)
    } catch (thrown) {
      const status = (thrown as { status?: unknown }).status
      code = typeof status === 'number' ? status : 2
    }
    let output: Uint8Array<ArrayBuffer> | null = null
    if (QPDF_OK(code)) {
      try {
        output = qpdf.FS.readFile('/out.pdf') as Uint8Array<ArrayBuffer>
      } catch {
        // Lệnh chỉ đọc (--show-encryption) không ghi tệp ra.
      }
    }
    return { code, stdout, output }
  }
}

export const runQpdf: QpdfRun = createQpdfRunner(wasmUrl)
