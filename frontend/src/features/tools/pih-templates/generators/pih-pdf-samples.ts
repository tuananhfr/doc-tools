import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Nội dung mẫu "PI Holding" cho các công cụ PDF — sinh hoàn toàn trên trình duyệt, không tải
 * tệp nhị phân nào từ máy chủ hay bên thứ ba (không cần quét mã độc, không có macro). MỌI số
 * liệu, tên người, địa chỉ đều là dữ liệu giả lập, đánh dấu "DEMO"/"SAMPLE" trên từng trang.
 *
 * Chữ trong PDF cố tình viết tiếng Anh, giống hệt `editor-samples.ts` đã có sẵn trong công cụ
 * Sửa PDF: font chuẩn của pdf-lib (WinAnsi) không mã hoá được nhiều dấu tổ hợp tiếng Việt (vd.
 * "Ẫ", "Ệ") — `pih-pdf-samples.test.ts` từng đỏ vì việc này khi nội dung còn là tiếng Việt.
 * Nhúng font Unicode riêng là việc thêm hạ tầng mới không cần thiết cho tài liệu demo.
 *
 * KHÔNG dùng số liệu thật của bất kỳ công ty nào trong nhóm PI Holding (doanh thu, hợp đồng,
 * khách hàng...). Tên thương hiệu (LPC, Ubot, PI Holding, Tekshot) là thương hiệu của chính
 * nhóm — không phải logo/số liệu bên thứ ba — nên dùng được làm bối cảnh minh hoạ, miễn là mọi
 * con số đi kèm là hư cấu.
 */

const PAGE: [number, number] = [595.28, 841.89] // A4

async function baseDoc() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  return { doc, font, bold }
}

function header(page: ReturnType<PDFDocument['addPage']>, bold: Awaited<ReturnType<PDFDocument['embedFont']>>, font: Awaited<ReturnType<PDFDocument['embedFont']>>, title: string) {
  page.drawRectangle({ x: 42, y: 757, width: 5, height: 43, color: rgb(.04, .4, .95) })
  page.drawText('PI HOLDING - SAMPLE TO TRY', { x: 59, y: 784, size: 11, font: bold, color: rgb(.04, .25, .58) })
  page.drawText(title, { x: 59, y: 765, size: 10, font })
}

function footer(page: ReturnType<PDFDocument['addPage']>, font: Awaited<ReturnType<PDFDocument['embedFont']>>, note = 'Simulated data - for feature demonstration only, not real figures.') {
  page.drawText(note, { x: 55, y: 30, size: 8, font, color: rgb(.42, .47, .56) })
}

/** PDF edit: "Ubot tech profile" — fictional product profile, several sections to try text edit/annotation on. */
export async function createPihTechProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page1 = doc.addPage(PAGE)
  header(page1, bold, font, 'Tech profile - demo document')
  page1.drawText('UBOT TECH PROFILE (DEMO)', { x: 55, y: 700, size: 20, font: bold })
  page1.drawText('Fictional process-automation platform used for this sample document', { x: 55, y: 676, size: 11, font })
  const intro = [
    '"Ubot Demo" is a made-up name for a process-automation platform, used in this',
    'sample so you can try the PDF edit tool: edit text, add notes, draw highlights.',
    '',
    'Table of contents (sample):',
    '  1. Platform introduction',
    '  2. Architecture overview (DEMO)',
    '  3. Sample delivery capability',
    '  4. Contact (fictional information)',
  ]
  intro.forEach((line, i) => page1.drawText(line, { x: 55, y: 636 - i * 20, size: 11, font }))
  footer(page1, font)

  const page2 = doc.addPage(PAGE)
  header(page2, bold, font, 'Architecture overview (DEMO)')
  page2.drawText('2. ARCHITECTURE OVERVIEW (DEMO)', { x: 55, y: 700, size: 16, font: bold })
  const rows = [
    ['Module (fictional)', 'Sample function'],
    ['DEMO process core', 'Mock task routing, not connected to any real system'],
    ['DEMO connector', 'Simulated data exchange between two sample apps'],
    ['DEMO reporting', 'Illustrative figures, not real operating data'],
  ]
  rows.forEach((row, i) => {
    const y = 650 - i * 26
    page2.drawText(row[0], { x: 55, y, size: 11, font: i === 0 ? bold : font })
    page2.drawText(row[1], { x: 230, y, size: 11, font: i === 0 ? bold : font })
  })
  page2.drawLine({ start: { x: 55, y: 660 }, end: { x: 540, y: 660 }, thickness: .5, color: rgb(.84, .88, .94) })
  footer(page2, font)

  return new File([new Uint8Array(await doc.save())], 'ubot-tech-profile-demo.pdf', { type: 'application/pdf' })
}

/** Convert: "LPC company profile" — short profile to try the Convert-file tool (PDF -> Word/Excel/image). */
export async function createPihLpcProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page = doc.addPage(PAGE)
  header(page, bold, font, 'Company profile - demo document')
  page.drawText('LPC COMPANY PROFILE (DEMO)', { x: 55, y: 700, size: 20, font: bold })
  const lines = [
    'LPC Demo Co., Ltd.', '',
    'Sector (fictional): enterprise management software',
    'Founded (fictional): 20XX',
    'Headcount (fictional): about one hundred people',
    '',
    'Sample capabilities (illustrative, not real data):',
    '  - Deploying management software for small and mid-size businesses',
    '  - Advising on internal digitisation processes',
    '  - Post-deployment operating support',
  ]
  lines.forEach((line, i) => page.drawText(line, { x: 55, y: 660 - i * 22, size: 11, font }))
  footer(page, font)
  return new File([new Uint8Array(await doc.save())], 'lpc-profile-demo.pdf', { type: 'application/pdf' })
}

/** PDF merge: three loose "PIH brochure" pages (cover / content / contact) to try merge-PDF. */
export async function createPihBrochurePages(): Promise<File[]> {
  const sections = [
    { title: 'COVER PAGE (DEMO)', body: ['PI HOLDING', 'Group introduction brochure - sample', '(not an official publication)'] },
    { title: 'CONTENT (DEMO)', body: ['Fictional products in the sample ecosystem:', '  - ERPCons Demo - enterprise management', '  - Tekshot Demo - production management', '  - Ubot Demo - process automation', '', 'Every name and figure on this page exists only to try the merge-PDF feature.'] },
    { title: 'CONTACT (DEMO)', body: ['Fictional contact information:', '  Demo website: (not a real address)', '  Demo email: (not a real address)', '', 'Press "Merge PDF" to combine these three sample pages into one file.'] },
  ]
  const files: File[] = []
  for (const [index, section] of sections.entries()) {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `PIH brochure - page ${index + 1}/3 (demo)`)
    page.drawText(section.title, { x: 55, y: 700, size: 18, font: bold })
    section.body.forEach((line, i) => page.drawText(line, { x: 55, y: 660 - i * 22, size: 11, font }))
    footer(page, font)
    files.push(new File([new Uint8Array(await doc.save())], `brochure-pih-demo-${index + 1}.pdf`, { type: 'application/pdf' }))
  }
  return files
}

/** PDF split: one multi-page (6-page) "PIH brochure" file to try split-PDF. */
export async function createPihBrochureBooklet(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  for (let i = 1; i <= 6; i++) {
    const page = doc.addPage(PAGE)
    header(page, bold, font, 'PIH brochure - sample booklet (demo)')
    page.drawText(`PAGE ${i} / 6 (DEMO)`, { x: 55, y: 700, size: 20, font: bold })
    page.drawText('Sample content for trying the split-PDF, page-range feature.', { x: 55, y: 660, size: 11, font })
    page.drawText('Everything in this file is simulated data.', { x: 55, y: 638, size: 11, font })
    footer(page, font)
  }
  return new File([new Uint8Array(await doc.save())], 'brochure-pih-demo-booklet.pdf', { type: 'application/pdf' })
}

/** Document compare: "LPC contract A/B" — two near-identical PDFs with a few deliberate differences, to try compare-PDF. */
export async function createPihContractPair(): Promise<[File, File]> {
  const common = [
    'FRAMEWORK AGREEMENT (DEMO)',
    'Between: LPC Demo Co., Ltd. (Party A)',
    'And: Demo Customer (Party B)',
    '',
    'Article 1. Scope of cooperation (fictional)',
    'Both parties cooperate, for demo purposes, in enterprise management software.',
    '',
    'Article 2. Term (fictional)',
  ]
  async function build(extra: string[], suffix: 'a' | 'b') {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `LPC contract - version ${suffix.toUpperCase()} (demo)`)
    const lines = [...common, ...extra]
    lines.forEach((line, i) => page.drawText(line, { x: 55, y: 700 - i * 20, size: 11, font }))
    footer(page, font)
    return new File([new Uint8Array(await doc.save())], `lpc-contract-demo-${suffix}.pdf`, { type: 'application/pdf' })
  }
  const a = await build(['This agreement is valid for 12 months from the signing date (demo).', '', 'Article 3. Contract value (fictional)', 'Sample value: 100,000,000 VND (one hundred million, demo figure).'], 'a')
  const b = await build(['This agreement is valid for 24 months from the signing date (demo).', '', 'Article 3. Contract value (fictional)', 'Sample value: 120,000,000 VND (one hundred twenty million, demo figure).', 'Article 4. Additional clause (fictional, new in version B)', 'Both parties agree to a quarterly review (demo).'], 'b')
  return [a, b]
}
