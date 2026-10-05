import { Zip, ZipPassThrough } from 'fflate'
import { uniqueName } from './file-names'

export interface ZipEntry {
  name: string
  data: Uint8Array
}

/**
 * Zip ghi dần, KHÔNG nén lại (PDF/JPG/PNG vốn đã nén, nén thêm chỉ tốn CPU).
 * Mỗi mảnh ra đổi ngay thành Blob — trình duyệt giữ Blob ngoài heap của tab
 * (lớn thì đẩy xuống đĩa), nên 100 ảnh bản vẽ A0 (~190 MB) không phải nằm
 * cùng lúc hai bản trong RAM như `zipSync`. Tên trùng được đánh số.
 */
export function createZipWriter() {
  const parts: Blob[] = []
  const used = new Set<string>()
  let failure: Error | null = null
  const zip = new Zip((error, chunk) => {
    if (error) failure = error
    else parts.push(new Blob([chunk as Uint8Array<ArrayBuffer>]))
  })

  return {
    add(name: string, data: Uint8Array) {
      const entry = new ZipPassThrough(uniqueName(name, used))
      zip.add(entry)
      entry.push(data, true)
    },
    finish(): Blob {
      zip.end()
      if (failure) throw failure
      return new Blob(parts, { type: 'application/zip' })
    },
  }
}

export function zipFiles(files: ZipEntry[]): Blob {
  const writer = createZipWriter()
  for (const file of files) writer.add(file.name, file.data)
  return writer.finish()
}
