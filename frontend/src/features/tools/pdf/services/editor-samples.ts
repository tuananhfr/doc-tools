import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
export type EditorSample = 'contract' | 'invoice' | 'notes'
/** Small local demonstration documents; no download or external integration is needed. */
export async function createEditorSample(kind: EditorSample): Promise<File> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const title = { contract: 'SAMPLE AGREEMENT', invoice: 'SAMPLE INVOICE', notes: 'MEETING NOTES' }[kind]
  doc.setTitle(title)
  for (let index = 0; index < (kind === 'contract' ? 3 : 1); index++) {
    const page = doc.addPage([595.28, 841.89])
    page.drawRectangle({ x: 42, y: 757, width: 5, height: 43, color: rgb(.04, .4, .95) })
    page.drawText('CHUYEN NHO', { x: 59, y: 784, size: 12, font: bold, color: rgb(.04, .25, .58) })
    page.drawText('PDF editor - practice document', { x: 59, y: 765, size: 10, font })
    page.drawText(title, { x: 55, y: 701, size: 22, font: bold })
    const lines = kind === 'invoice'
      ? ['Invoice: DEMO-001', 'Customer: Example Company', 'Description                         Quantity          Amount', 'Document preparation                    1              100.00', 'Design and review                       2              200.00', 'Total                                                  300.00']
      : kind === 'notes' ? ['Meeting: Project planning', 'Date: __________________________', 'Participants: ___________________', '1. Agenda and goals', '2. Decisions and next steps', '3. Tasks, owners and deadlines']
      : [`Section ${index + 1}: Terms and responsibilities`, 'Party A: ________________________', 'Party B: ________________________', 'This is a demonstration document for trying PDF editing.', 'Select a tool to add text, highlight a sentence or draw.', 'You can reorder, duplicate and rotate these pages.']
    lines.forEach((line, i) => page.drawText(line, { x: 55, y: 657 - i * 40, size: 11, font }))
    for (let y = 357; y > 170; y -= 28) page.drawLine({ start: { x: 55, y }, end: { x: 540, y }, thickness: .5, color: rgb(.84, .88, .94) })
    page.drawText('Signature: ___________________', { x: 55, y: 120, size: 11, font })
    page.drawText(`SAMPLE ONLY  -  Page ${index + 1}`, { x: 220, y: 40, size: 9, font, color: rgb(.4, .46, .55) })
  }
  return new File([new Uint8Array(await doc.save())], `${kind}-sample.pdf`, { type: 'application/pdf' })
}
