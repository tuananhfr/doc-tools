export function pngDensity(bytes: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  if (bytes.length < 33 || !Number.isFinite(dpi) || dpi <= 0) throw new Error('PNG_DENSITY_INVALID')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks: Uint8Array[] = [bytes.slice(0, 8)]
  const density = new Uint8Array(21), meta = new DataView(density.buffer)
  meta.setUint32(0, 9); density.set([112, 72, 89, 115], 4)
  meta.setUint32(8, Math.round(dpi / .0254)); meta.setUint32(12, Math.round(dpi / .0254)); density[16] = 1
  let crc = 0xffffffff
  for (const byte of density.slice(4, 17)) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ crc >>> 1 : crc >>> 1 }
  meta.setUint32(17, (crc ^ 0xffffffff) >>> 0)
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset), end = offset + length + 12
    if (end > bytes.length) throw new Error('PNG_DENSITY_INVALID')
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
    if (type !== 'pHYs') chunks.push(bytes.slice(offset, end))
    if (type === 'IHDR') chunks.push(density)
    offset = end
  }
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let cursor = 0; for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length }
  return result
}
