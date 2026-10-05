/**
 * "Sửa tiếp" ở màn kết quả của công cụ nhanh: tệp vừa dựng được đưa sang trình
 * chỉnh sửa. Tệp chỉ sống trong RAM của tab nên không đi qua URL hay
 * `history.state` được (state của router bị tuần tự hoá) — giữ tạm ở đây cho
 * tới khi trình chỉnh sửa mount và lấy đi.
 */
let pending: File[] = []

export function handOffFiles(files: File[]): void {
  pending = files
}

/** Lấy MỘT lần: F5 hay quay lại trình chỉnh sửa lần sau không nạp lại tệp cũ. */
export function takeHandoff(): File[] {
  const files = pending
  pending = []
  return files
}
