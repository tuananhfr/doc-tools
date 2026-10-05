import { PDFArray, PDFBool, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, type PDFDocument, type PDFObject } from 'pdf-lib'
import { attachJpegExif, canvasToBlob, exifForRedraw, readJpegExif } from '@/features/tools/shared'
import {
  classifyImage,
  COMPRESSION_PROFILE,
  MIN_SAVING,
  NO_COMPRESSION_STATS,
  scaledSize,
  type Compression,
  type CompressionProfile,
  type CompressionStats,
  type ImageInfo,
} from '../utils/compression'

const IMAGE = PDFName.of('Image')

function nameText(value: PDFObject | undefined): string | null {
  return value instanceof PDFName ? value.decodeText() : null
}

function filtersOf(dict: PDFDict): string[] {
  const filter = dict.lookup(PDFName.of('Filter'))
  if (filter instanceof PDFName) return [filter.decodeText()]
  if (filter instanceof PDFArray) return filter.asArray().map((item) => nameText(item instanceof PDFRef ? dict.context.lookup(item) : item) ?? '?')
  return []
}

function colorSpaceOf(dict: PDFDict): Pick<ImageInfo, 'colorSpace' | 'iccChannels'> {
  const space = dict.lookup(PDFName.of('ColorSpace'))
  if (space instanceof PDFName) return { colorSpace: space.decodeText() }
  if (space instanceof PDFArray && space.size() > 0) {
    const family = nameText(space.lookup(0))
    const profile = family === 'ICCBased' ? space.lookup(1) : undefined
    const channels = profile instanceof PDFStream ? profile.dict.lookup(PDFName.of('N')) : undefined
    return { colorSpace: family, iccChannels: channels instanceof PDFNumber ? channels.asNumber() : undefined }
  }
  return { colorSpace: null }
}

function imageInfo(stream: PDFRawStream): ImageInfo {
  const { dict } = stream
  const bits = dict.lookup(PDFName.of('BitsPerComponent'))
  return {
    filters: filtersOf(dict),
    ...colorSpaceOf(dict),
    bitsPerComponent: bits instanceof PDFNumber ? bits.asNumber() : null,
    imageMask: dict.lookup(PDFName.of('ImageMask')) === PDFBool.True,
    hasMask: dict.has(PDFName.of('Mask')),
    hasDecode: dict.has(PDFName.of('Decode')),
    bytes: stream.contents.byteLength,
  }
}

async function reencode(bytes: Uint8Array, profile: CompressionProfile) {
  let bitmap: ImageBitmap
  try {
    // PDF bỏ qua cờ xoay EXIF; để trình duyệt áp nó là ảnh nén lại bị xoay lệch khỏi bản gốc.
    bitmap = await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }), { imageOrientation: 'none' })
  } catch {
    return null
  }
  try {
    const size = scaledSize(bitmap.width, bitmap.height, profile.maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await canvasToBlob(canvas, 'image/jpeg', profile.quality).catch(() => null)
    if (!blob) return null
    // Ảnh scan từ điện thoại mang ngày chụp + GPS trong chính luồng JPEG: nén lại không được làm mất.
    // Cờ hướng giữ nguyên vì điểm ảnh ở đây không hề bị xoay.
    const exif = readJpegExif(bytes)
    const adjusted = exif ? exifForRedraw(exif, size, 'as-is') : null
    const tagged = adjusted ? await attachJpegExif(blob, adjusted) : null
    return { bytes: new Uint8Array(await (tagged ?? blob).arrayBuffer()), ...size }
  } finally {
    bitmap.close()
  }
}

/**
 * Nén lại ảnh JPEG trong tệp đang dựng (trước khi lưu). Ảnh nén lại mà không
 * nhỏ đi đủ thì giữ bản cũ — nén hai lần một ảnh đã nén kỹ chỉ làm xấu đi.
 */
export async function compressImages(doc: PDFDocument, level: Compression): Promise<CompressionStats> {
  if (level === 'none') return NO_COMPRESSION_STATS
  const profile = COMPRESSION_PROFILE[level]
  const { context } = doc
  const images: [PDFRef, PDFRawStream][] = []
  const softMasks = new Set<PDFRef>()
  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of('Subtype')) !== IMAGE) continue
    images.push([ref, object])
    const mask = object.dict.get(PDFName.of('SMask'))
    if (mask instanceof PDFRef) softMasks.add(mask)
  }

  const stats = { ...NO_COMPRESSION_STATS }
  for (const [ref, stream] of images) {
    // Mặt nạ trong suốt luôn là Flate — đếm vào "Flate giữ nguyên" là báo sai số ảnh.
    if (softMasks.has(ref)) continue
    const verdict = classifyImage(imageInfo(stream))
    if (verdict === 'flate') stats.flate++
    if (verdict !== 'recompress') continue

    const smaller = await reencode(stream.contents, profile)
    if (!smaller || smaller.bytes.byteLength > stream.contents.byteLength * (1 - MIN_SAVING)) continue

    const dict = stream.dict.clone(context)
    dict.set(PDFName.of('Width'), PDFNumber.of(smaller.width))
    dict.set(PDFName.of('Height'), PDFNumber.of(smaller.height))
    dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'))
    dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8))
    dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'))
    dict.delete(PDFName.of('DecodeParms'))
    context.assign(ref, PDFRawStream.of(dict, smaller.bytes))
    stats.recompressed++
    stats.savedBytes += stream.contents.byteLength - smaller.bytes.byteLength
  }
  return stats
}
