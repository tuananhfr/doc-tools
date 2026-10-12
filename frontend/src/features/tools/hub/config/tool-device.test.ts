import { describe, expect, it } from 'vitest'
import { ALL_TOOLS } from './tool-list'
import type { ReadyToolEntry, ToolOffline } from '../types/tool.types'

// Luật phân loại (WP6) — công cụ mới phải theo đúng luật này:
// R1 cần dịch vụ mạng cho chức năng hoặc số liệu hiển thị (API của mình trừ lượt xem/góp ý/kiểm nguồn AI,
//    GoClaw, nhận giọng nói của trình duyệt) → 'no' + needs có 'network'.
// R2 không R1 nhưng cần tệp ngoài precache (pdf.worker .mjs, wasm pdfium/qpdf/ORT, model /vendor, FFmpeg,
//    /assets) → 'after-first-use'.
// R3 còn lại → 'yes'. Nghi ngờ thì hạ mức, không bao giờ nâng khi chưa có check-offline.mjs chứng minh.
const EXPECTED: Record<ToolOffline, string[]> = {
  no: ['numerology', 'playing-cards', 'tarot', 'lunar-calendar', 'assistant', 'electricity', 'payroll', 'address-conversion', 'qr-create', 'code-manager', 'dictation'],
  'after-first-use': [
    'view-pdf', 'edit-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'convert-file', 'pdf-to-image', 'organize-pdf', 'page-numbers',
    'stamp-pdf', 'redact-pdf', 'sign', 'compare', 'ocr', 'image-to-text', 'scan-to-pdf', 'pdf-password',
    'compress-video', 'trim-video', 'video-gif', 'extract-audio', 'remove-background', 'read-aloud', 'house-orientation', 'id-photo',
  ],
  yes: [
    'quick-design', 'spin-wheel', 'cv', 'family-calendar', 'form-templates', 'magnifier', 'house-estimate', 'number-words', 'loan',
    'unit-price', 'study', 'pomodoro', 'group-split', 'legacy-font', 'vietqr', 'invoice-xml', 'remove-metadata', 'collage',
    'message-risk', 'flashcards', 'measure-image', 'convert-image', 'compress-image', 'crop-image', 'batch-image', 'mark-image',
    'barcode-create', 'qr-read', 'quick-calc', 'money-calc', 'date-calc', 'quick-note', 'char-count', 'unit-convert', 'color', 'random-code',
  ],
}
const CAMERA = ['magnifier', 'qr-read', 'id-photo', 'scan-to-pdf', 'house-orientation']
const MIC = ['dictation']

const ready = ALL_TOOLS.filter((tool): tool is ReadyToolEntry => tool.status === 'ready')
const sorted = (ids: string[]) => [...ids].sort()

describe('device capability of ready tools', () => {
  it('every ready tool declares it', () => {
    expect(ready.filter((tool) => !tool.device).map((tool) => tool.id)).toEqual([])
  })
  it('"no" exactly when the tool needs the network', () => {
    for (const tool of ready) expect([tool.id, tool.device.offline === 'no'], tool.id).toEqual([tool.id, Boolean(tool.device.needs?.includes('network'))])
  })
  it('matches the reviewed classification', () => {
    for (const offline of Object.keys(EXPECTED) as ToolOffline[]) {
      expect(sorted(ready.filter((tool) => tool.device.offline === offline).map((tool) => tool.id)), offline).toEqual(sorted(EXPECTED[offline]))
    }
  })
  it('declares camera and microphone use', () => {
    expect(sorted(ready.filter((tool) => tool.device.needs?.includes('camera')).map((tool) => tool.id))).toEqual(sorted(CAMERA))
    expect(sorted(ready.filter((tool) => tool.device.needs?.includes('mic')).map((tool) => tool.id))).toEqual(sorted(MIC))
  })
  it('lists no need twice', () => {
    for (const tool of ready) expect(new Set(tool.device.needs ?? []).size, tool.id).toBe((tool.device.needs ?? []).length)
  })
})
