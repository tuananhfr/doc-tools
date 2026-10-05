const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00]

/**
 * Ghi mật độ điểm ảnh (DPI) vào khối JFIF của một JPG do canvas mã hoá — canvas
 * luôn ghi "không đơn vị, 1:1", nên phần mềm in coi ảnh là 72 hoặc 96 DPI và in
 * tờ A4 ra to gấp ba. Sửa TẠI CHỖ; `false` = tệp không mở đầu bằng JFIF, để nguyên.
 */
export function setJpegDensity(bytes: Uint8Array, dpi: number): boolean {
  if (bytes.length < 18 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[3] !== 0xe0) return false
  if (!JFIF.every((value, index) => bytes[6 + index] === value)) return false
  bytes[13] = 1
  bytes[14] = dpi >> 8
  bytes[15] = dpi & 0xff
  bytes[16] = dpi >> 8
  bytes[17] = dpi & 0xff
  return true
}
