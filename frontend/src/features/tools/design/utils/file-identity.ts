const ids = new WeakMap<File, number>()
let last = 0

/** Số định danh theo ĐỐI TƯỢNG File: hai ảnh cùng tên/cỡ/ngày sửa vẫn là hai ảnh khác nhau. */
export function fileIdentity(file: File): number {
  let id = ids.get(file)
  if (id === undefined) { id = ++last; ids.set(file, id) }
  return id
}

export function fileKey(file: File): [number, string, number, number] {
  return [fileIdentity(file), file.name, file.size, file.lastModified]
}
