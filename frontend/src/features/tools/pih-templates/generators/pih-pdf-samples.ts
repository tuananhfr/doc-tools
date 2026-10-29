import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Nội dung mẫu "PI Holding" cho các công cụ PDF — sinh hoàn toàn trên trình duyệt, không tải
 * tệp nhị phân nào từ máy chủ hay bên thứ ba (không cần quét mã độc, không có macro). MỌI số
 * liệu, tên người, địa chỉ đều là dữ liệu giả lập, đánh dấu "DEMO"/"MẪU" trên từng trang theo
 * đúng tinh thần `editor-samples.ts` đã có sẵn trong công cụ Sửa PDF — xem docs/pi-holding-templates/.
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
  page.drawText('PI HOLDING — MẪU ĐỂ THỬ', { x: 59, y: 784, size: 11, font: bold, color: rgb(.04, .25, .58) })
  page.drawText(title, { x: 59, y: 765, size: 10, font })
}

function footer(page: ReturnType<PDFDocument['addPage']>, font: Awaited<ReturnType<PDFDocument['embedFont']>>, note = 'Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.') {
  page.drawText(note, { x: 55, y: 30, size: 8, font, color: rgb(.42, .47, .56) })
}

/** PDF edit: "Hồ sơ công nghệ Ubot" — hồ sơ giới thiệu công nghệ giả lập, nhiều mục để thử chỉnh chữ/đánh dấu. */
export async function createPihTechProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page1 = doc.addPage(PAGE)
  header(page1, bold, font, 'Hồ sơ công nghệ — bản demo')
  page1.drawText('HỒ SƠ CÔNG NGHỆ UBOT (DEMO)', { x: 55, y: 700, size: 20, font: bold })
  page1.drawText('Nền tảng tự động hoá quy trình minh hoạ cho PI Holding Group', { x: 55, y: 676, size: 11, font })
  const intro = [
    'Ubot Demo là tên gọi minh hoạ cho một nền tảng tự động hoá quy trình, dùng trong tài',
    'liệu mẫu này để người dùng thử tính năng chỉnh sửa PDF: sửa chữ, thêm ghi chú, đánh dấu.',
    '',
    'Mục lục (minh hoạ):',
    '  1. Giới thiệu nền tảng',
    '  2. Kiến trúc tổng quan (DEMO)',
    '  3. Năng lực triển khai mẫu',
    '  4. Liên hệ (thông tin giả lập)',
  ]
  intro.forEach((line, i) => page1.drawText(line, { x: 55, y: 636 - i * 20, size: 11, font }))
  footer(page1, font)

  const page2 = doc.addPage(PAGE)
  header(page2, bold, font, 'Kiến trúc tổng quan (DEMO)')
  page2.drawText('2. KIẾN TRÚC TỔNG QUAN (DEMO)', { x: 55, y: 700, size: 16, font: bold })
  const rows = [
    ['Mô-đun (giả lập)', 'Chức năng minh hoạ'],
    ['Lõi quy trình DEMO', 'Điều phối tác vụ mẫu, không nối hệ thống thật'],
    ['Kết nối DEMO', 'Mô phỏng trao đổi dữ liệu giữa hai ứng dụng mẫu'],
    ['Báo cáo DEMO', 'Số liệu minh hoạ, không phải số liệu vận hành thật'],
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

/** Convert: "Hồ sơ năng lực LPC" — hồ sơ ngắn để thử Chuyển đổi file (PDF -> Word/Excel/ảnh). */
export async function createPihLpcProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page = doc.addPage(PAGE)
  header(page, bold, font, 'Hồ sơ năng lực — bản demo')
  page.drawText('HỒ SƠ NĂNG LỰC LPC (DEMO)', { x: 55, y: 700, size: 20, font: bold })
  const lines = [
    'Công ty TNHH LPC Demo', '',
    'Lĩnh vực (giả lập): giải pháp phần mềm quản trị doanh nghiệp',
    'Năm thành lập (giả lập): 20XX',
    'Quy mô nhân sự (giả lập): khoảng một trăm người',
    '',
    'Năng lực tiêu biểu (minh hoạ, không phải dữ liệu thật):',
    '  - Triển khai phần mềm quản trị cho doanh nghiệp vừa và nhỏ',
    '  - Tư vấn quy trình số hoá nội bộ',
    '  - Hỗ trợ vận hành sau triển khai',
  ]
  lines.forEach((line, i) => page.drawText(line, { x: 55, y: 660 - i * 22, size: 11, font }))
  footer(page, font)
  return new File([new Uint8Array(await doc.save())], 'lpc-profile-demo.pdf', { type: 'application/pdf' })
}

/** PDF merge: ba trang rời "Brochure PIH" (bìa / nội dung / liên hệ) để thử ghép PDF. */
export async function createPihBrochurePages(): Promise<File[]> {
  const titles = [
    { title: 'TRANG BÌA (DEMO)', body: ['PI HOLDING', 'Brochure giới thiệu nhóm — bản minh hoạ', '(không phải ấn phẩm chính thức)'] },
    { title: 'NỘI DUNG (DEMO)', body: ['Các sản phẩm minh hoạ trong hệ sinh thái mẫu:', '  - ERPCons Demo — quản trị doanh nghiệp', '  - Tekshot Demo — quản lý sản xuất', '  - Ubot Demo — tự động hoá quy trình', '', 'Mọi tên gọi, số liệu trong trang này chỉ để thử tính năng ghép PDF.'] },
    { title: 'LIÊN HỆ (DEMO)', body: ['Thông tin liên hệ minh hoạ:', '  Website demo: (không phải địa chỉ thật)', '  Email demo: (không phải địa chỉ thật)', '', 'Bấm "Ghép PDF" để gộp ba trang mẫu này thành một tệp.'] },
  ]
  const files: File[] = []
  for (const [index, section] of titles.entries()) {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Brochure PIH — trang ${index + 1}/3 (demo)`)
    page.drawText(section.title, { x: 55, y: 700, size: 18, font: bold })
    section.body.forEach((line, i) => page.drawText(line, { x: 55, y: 660 - i * 22, size: 11, font }))
    footer(page, font)
    files.push(new File([new Uint8Array(await doc.save())], `brochure-pih-demo-${index + 1}.pdf`, { type: 'application/pdf' }))
  }
  return files
}

/** PDF split: một tệp nhiều trang "Brochure PIH" (6 trang) để thử tách PDF. */
export async function createPihBrochureBooklet(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  for (let i = 1; i <= 6; i++) {
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Brochure PIH — tài liệu mẫu (demo)`)
    page.drawText(`TRANG ${i} / 6 (DEMO)`, { x: 55, y: 700, size: 20, font: bold })
    page.drawText('Nội dung minh hoạ để thử tính năng Tách PDF theo khoảng trang.', { x: 55, y: 660, size: 11, font })
    page.drawText('Mọi nội dung trong tệp này là dữ liệu giả lập.', { x: 55, y: 638, size: 11, font })
    footer(page, font)
  }
  return new File([new Uint8Array(await doc.save())], 'brochure-pih-demo-booklet.pdf', { type: 'application/pdf' })
}

/** Document compare: "Hợp đồng LPC bản A/B" — hai bản PDF gần giống nhau, khác vài chỗ có chủ đích, để thử So sánh PDF. */
export async function createPihContractPair(): Promise<[File, File]> {
  const common = [
    'HỢP ĐỒNG NGUYÊN TẮC (DEMO)',
    'Giữa: Công ty TNHH LPC Demo (Bên A)',
    'Và: Khách hàng Demo (Bên B)',
    '',
    'Điều 1. Phạm vi hợp tác (giả lập)',
    'Hai bên hợp tác demo trong lĩnh vực phần mềm quản trị doanh nghiệp.',
    '',
    'Điều 2. Thời hạn (giả lập)',
  ]
  async function build(extra: string[], suffix: 'a' | 'b') {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Hợp đồng LPC — bản ${suffix.toUpperCase()} (demo)`)
    const lines = [...common, ...extra]
    lines.forEach((line, i) => page.drawText(line, { x: 55, y: 700 - i * 20, size: 11, font }))
    footer(page, font)
    return new File([new Uint8Array(await doc.save())], `hop-dong-lpc-demo-${suffix}.pdf`, { type: 'application/pdf' })
  }
  const a = await build(['Hợp đồng có hiệu lực 12 tháng kể từ ngày ký (demo).', '', 'Điều 3. Giá trị hợp đồng (giả lập)', 'Giá trị minh hoạ: 100.000.000 đồng (một trăm triệu, số demo).'], 'a')
  const b = await build(['Hợp đồng có hiệu lực 24 tháng kể từ ngày ký (demo).', '', 'Điều 3. Giá trị hợp đồng (giả lập)', 'Giá trị minh hoạ: 120.000.000 đồng (một trăm hai mươi triệu, số demo).', 'Điều 4. Điều khoản bổ sung (giả lập, bản B thêm mới)', 'Hai bên thống nhất rà soát lại mỗi quý (demo).'], 'b')
  return [a, b]
}
