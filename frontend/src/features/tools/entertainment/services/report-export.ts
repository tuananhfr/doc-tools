export interface ReportDocument { title: string; lines: string[]; disclaimer: string }

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = []; let line = ''
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= width) { line = candidate; continue }
    if (line) result.push(line)
    line = ''
    for (const character of [...word]) {
      if (line && context.measureText(line + character).width > width) { result.push(line); line = '' }
      line += character
    }
  }
  result.push(line)
  return result
}
function renderPage(report: ReportDocument, lines: string[]) {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1697
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#0c254d'; context.font = 'bold 44px "CN Be Vietnam Pro", Arial, sans-serif'
  let y = 90
  for (const line of wrap(context, report.title, 1056)) { context.fillText(line, 72, y); y += 58 }
  context.font = '28px "CN Be Vietnam Pro", Arial, sans-serif'
  y += 30
  for (const line of lines) { context.fillText(line, 72, y); y += 42 }
  context.strokeStyle = '#dce7f3'; context.beginPath(); context.moveTo(72, 1390); context.lineTo(1128, 1390); context.stroke()
  context.font = '24px "CN Be Vietnam Pro", Arial, sans-serif'
  wrap(context, report.disclaimer, 1056).forEach((line, index) => context.fillText(line, 72, 1440 + index * 34))
  return canvas
}
const blobOf = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png'))
export async function exportReport(report: ReportDocument, format: 'pdf' | 'png'): Promise<Blob> {
  await document.fonts.ready
  const measure = document.createElement('canvas').getContext('2d')!; measure.font = '28px "CN Be Vietnam Pro", Arial, sans-serif'
  const lines = report.lines.flatMap(line => wrap(measure, line, 1056))
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 26)) }, (_, index) => renderPage(report, lines.slice(index * 26, (index + 1) * 26)))
  try {
    if (format === 'png') {
      const combined = document.createElement('canvas'); combined.width = 1200; combined.height = pages.length * 1697
      const context = combined.getContext('2d')!; pages.forEach((page, index) => context.drawImage(page, 0, index * 1697))
      try { return await blobOf(combined) } finally { combined.width = 0; combined.height = 0 }
    }
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    for (const canvas of pages) {
      const image = await pdf.embedPng(await (await blobOf(canvas)).arrayBuffer())
      const page = pdf.addPage([595.28, 841.89]); page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 })
    }
    return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
  } finally { pages.forEach(page => { page.width = 0; page.height = 0 }) }
}
