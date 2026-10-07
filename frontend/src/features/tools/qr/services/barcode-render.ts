import { canvasToBlob, zipFiles } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { barcodeKind } from '../config/barcode-kinds'
import type { BarcodeKind } from '../types/barcode.types'
import { barcodeFileName } from '../utils/qr-file-name'
import { parseBarcodeSvg } from '../utils/svg-paths'

/** Cách in mã: cùng một bộ cho xem trước và mọi tệp ra. */
export interface BarcodeLook {
  includeText: boolean
  /** Chiều cao vạch, mm. */
  heightMm: number
  /** 1 = cỡ chuẩn (vạch hẹp nhất 0,33 mm, cỡ danh định của EAN). */
  magnification: number
}

export interface BarcodeItem {
  kind: BarcodeKind
  value: string
}

/** Bề rộng vạch hẹp nhất ở cỡ 100% (EAN-13 danh định), mm. */
const MODULE_MM = 0.33
const MM_PER_PT = 25.4 / 72
const PNG_DPI = 300
/** Vùng trắng hai bên, đếm bằng vạch hẹp — EAN cần ≥ 11 bên trái, máy quét cầm tay đọc trượt khi thiếu. */
const QUIET_MODULES = 12
// Mã vạch luôn đen trên trắng ở MỌI theme: máy quét đọc độ tương phản, không đọc theme.
const INK = '000000'
const PAPER = 'FFFFFF'

/** Số điểm (pt) cho một vạch hẹp — bwip-js vẽ ở `scale: 1` thì một vạch hẹp = 1 đơn vị. */
const unitPt = (look: BarcodeLook) => (MODULE_MM * look.magnification) / MM_PER_PT

type Bwip = typeof import('bwip-js/browser')

function renderOptions(item: BarcodeItem, look: BarcodeLook, scale: number) {
  const spec = barcodeKind(item.kind)
  return {
    bcid: spec.bcid,
    text: item.value,
    scale,
    // bwip-js đổi `height` (mm) theo 72 dpi rồi nhân chung với độ phóng — chia lại để vạch ra đúng số mm đã chọn.
    height: look.heightMm / unitPt(look),
    includetext: look.includeText,
    // EAN / ITF-14 có bố cục chữ theo chuẩn GS1 (số đầu nằm ngoài, hai nhóm số trong rãnh) — căn giữa là phá chuẩn.
    // Code 128 / 39 mặc định để chữ dính sát chân vạch: đẩy xuống 2 đơn vị cho dễ đọc.
    ...(spec.gs1 ? {} : { textxalign: 'center' as const, textyoffset: -2 }),
    paddingwidth: QUIET_MODULES,
    paddingheight: 2,
    barcolor: INK,
    backgroundcolor: PAPER,
  }
}

const mm = (units: number, look: BarcodeLook) => Math.round(units * unitPt(look) * MM_PER_PT * 100) / 100

/**
 * Bộ dựng mã, nạp bwip-js (~1 MB) một lần khi màn cần — không nằm trên đường
 * khởi động. Lỗi của bwip-js (giá trị lọt qua bước kiểm) được ném ra nguyên văn.
 */
export async function loadBarcodeEngine() {
  const bwip: Bwip = await import('bwip-js/browser')

  /** SVG mang sẵn khổ in thật (mm): mở bằng Illustrator / Word là đúng cỡ. */
  const svg = (item: BarcodeItem, look: BarcodeLook): string => {
    const raw = bwip.toSVG(renderOptions(item, look, 1))
    const parsed = parseBarcodeSvg(raw)
    if (!parsed) return raw
    return raw.replace('<svg ', `<svg width="${mm(parsed.width, look)}mm" height="${mm(parsed.height, look)}mm" `)
  }

  const png = async (item: BarcodeItem, look: BarcodeLook): Promise<Blob> => {
    // Số NGUYÊN điểm ảnh cho mỗi vạch hẹp: vạch lẻ điểm ảnh bị làm mịn thành xám, in ra máy quét đọc trượt.
    const scale = Math.max(2, Math.round((unitPt(look) / 72) * PNG_DPI))
    const canvas = document.createElement('canvas')
    try {
      bwip.toCanvas(canvas, renderOptions(item, look, scale))
      return await canvasToBlob(canvas, 'image/png')
    } finally {
      canvas.width = canvas.height = 0
    }
  }

  /** Mỗi mã một trang đúng khổ; vạch và chữ là nét VECTOR, in máy nào cũng nét. */
  const pdf = async (items: BarcodeItem[], look: BarcodeLook): Promise<Blob> => {
    const { PDFDocument, rgb } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    const factor = unitPt(look)
    for (const item of items) {
      const parsed = parseBarcodeSvg(bwip.toSVG(renderOptions(item, look, 1)))
      if (!parsed) throw new Error(translate('qr:render.barcodeFailed', { value: item.value }))
      const page = doc.addPage([parsed.width * factor, parsed.height * factor])
      for (const path of parsed.paths) {
        // `drawSvgPath` lật trục y và nhân cả độ dày nét theo `scale` — nét vạch ra đúng bề rộng.
        if (path.strokeWidth === null) page.drawSvgPath(path.d, { x: 0, y: page.getHeight(), scale: factor, color: rgb(0, 0, 0) })
        else page.drawSvgPath(path.d, { x: 0, y: page.getHeight(), scale: factor, borderColor: rgb(0, 0, 0), borderWidth: path.strokeWidth })
      }
    }
    doc.setTitle(items.length === 1 ? barcodeFileName(items[0].value) : `${items.length} mã vạch`)
    const bytes = await doc.save()
    return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  }

  /** Lô PNG / SVG gói thành một tệp zip, tên tệp = giá trị trong mã. */
  const zip = async (items: BarcodeItem[], type: 'png' | 'svg', look: BarcodeLook, onProgress?: (done: number) => void): Promise<Blob> => {
    const encoder = new TextEncoder()
    const files = []
    for (const [index, item] of items.entries()) {
      const data = type === 'svg' ? encoder.encode(svg(item, look)) : new Uint8Array(await (await png(item, look)).arrayBuffer())
      files.push({ name: `${barcodeFileName(item.value)}.${type}`, data })
      onProgress?.(index + 1)
    }
    return zipFiles(files)
  }

  return { svg, png, pdf, zip }
}

export type BarcodeEngine = Awaited<ReturnType<typeof loadBarcodeEngine>>
