import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { createFontLoader } from '@/features/tools/pdf/services/pdf-fonts'

/**
 * Nội dung mẫu "PI Holding" cho các công cụ PDF — sinh hoàn toàn trên trình duyệt, không tải
 * tệp nhị phân nào từ máy chủ hay bên thứ ba (không cần quét mã độc, không có macro). MỌI số
 * liệu, tên người, địa chỉ đều là dữ liệu giả lập, đánh dấu "DEMO"/"MẪU" trên từng trang.
 *
 * Dùng font tiếng Việt `BeVietnamPro` đã nhúng sẵn trong repo (`pdf-fonts.ts`, cùng hạ tầng
 * `@pdf-lib/fontkit` mà công cụ Sửa PDF/OCR→PDF đang dùng) thay vì 14 font chuẩn của pdf-lib
 * (bảng mã WinAnsi, không vẽ được dấu tổ hợp tiếng Việt như "Ẫ", "Ệ") — nên nội dung viết được
 * tiếng Việt tự nhiên, không phải né sang tiếng Anh như bản đầu tiên.
 *
 * KHÔNG dùng số liệu thật của bất kỳ công ty nào trong nhóm PI Holding (doanh thu, hợp đồng,
 * khách hàng...). Tên thương hiệu (LPC, Ubot, PI Holding, Tekshot) là thương hiệu của chính
 * nhóm — không phải logo/số liệu bên thứ ba — nên dùng được làm bối cảnh minh hoạ, miễn là mọi
 * con số đi kèm là hư cấu.
 */

const PAGE: [number, number] = [595.28, 841.89] // A4
const INK = rgb(.11, .13, .18)
const MUTED = rgb(.42, .47, .56)
const BRAND = rgb(.04, .4, .95)
const BRAND_DARK = rgb(.04, .25, .58)
const LINE = rgb(.84, .88, .94)
const FILL = rgb(.95, .96, .99)

async function baseDoc() {
  const doc = await PDFDocument.create()
  const loadFont = createFontLoader(doc)
  const font = await loadFont('regular')
  const bold = await loadFont('bold')
  return { doc, font, bold }
}

function header(page: PDFPage, bold: PDFFont, font: PDFFont, title: string) {
  page.drawRectangle({ x: 42, y: 757, width: 5, height: 43, color: BRAND })
  page.drawText('PI HOLDING — MẪU ĐỂ THỬ', { x: 59, y: 784, size: 11, font: bold, color: BRAND_DARK })
  page.drawText(title, { x: 59, y: 765, size: 10, font, color: MUTED })
}

function footer(page: PDFPage, font: PDFFont, note = 'Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.') {
  page.drawText(note, { x: 55, y: 30, size: 8, font, color: MUTED })
}

/** Bảng đơn giản vẽ bằng rectangle/line (pdf-lib không có API bảng sẵn): dòng tiêu đề tô nền, viền mảnh quanh từng ô. */
function table(page: PDFPage, font: PDFFont, bold: PDFFont, x: number, yTop: number, colWidths: number[], rows: string[][]) {
  const rowH = 24
  const width = colWidths.reduce((a, b) => a + b, 0)
  rows.forEach((row, r) => {
    const y = yTop - r * rowH
    if (r === 0) page.drawRectangle({ x, y: y - rowH + 6, width, height: rowH, color: FILL })
    let cx = x
    row.forEach((cell, c) => {
      page.drawText(cell, { x: cx + 8, y: y - 16, size: 10, font: r === 0 ? bold : font, color: r === 0 ? BRAND_DARK : INK })
      cx += colWidths[c]
    })
    page.drawLine({ start: { x, y: y - rowH + 6 }, end: { x: x + width, y: y - rowH + 6 }, thickness: .5, color: LINE })
  })
  page.drawLine({ start: { x, y: yTop + 6 }, end: { x: x + width, y: yTop + 6 }, thickness: .5, color: LINE })
  return yTop - rows.length * rowH
}

/** PDF edit: "Hồ sơ công nghệ Ubot" — hồ sơ sản phẩm giả lập, nhiều mục để thử sửa chữ/ghi chú/tô sáng. */
export async function createPihTechProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page1 = doc.addPage(PAGE)
  header(page1, bold, font, 'Hồ sơ công nghệ — tài liệu demo')
  page1.drawText('HỒ SƠ CÔNG NGHỆ UBOT (DEMO)', { x: 55, y: 700, size: 20, font: bold, color: INK })
  page1.drawText('Nền tảng tự động hoá quy trình hư cấu, dùng cho tài liệu mẫu này', { x: 55, y: 676, size: 11, font, color: MUTED })
  const intro = [
    '"Ubot Demo" là tên gọi hư cấu của một nền tảng tự động hoá quy trình, dùng trong',
    'tài liệu mẫu này để bạn thử công cụ Sửa PDF: sửa chữ, thêm ghi chú, tô sáng.',
    '',
    'Mục lục (minh hoạ):',
    '  1. Giới thiệu nền tảng',
    '  2. Kiến trúc tổng quan (DEMO)',
    '  3. Năng lực triển khai mẫu',
    '  4. Thông tin liên hệ (hư cấu)',
  ]
  intro.forEach((line, i) => page1.drawText(line, { x: 55, y: 636 - i * 20, size: 11, font, color: INK }))
  footer(page1, font)

  const page2 = doc.addPage(PAGE)
  header(page2, bold, font, 'Kiến trúc tổng quan (DEMO)')
  page2.drawText('2. KIẾN TRÚC TỔNG QUAN (DEMO)', { x: 55, y: 710, size: 16, font: bold, color: INK })
  const afterTable = table(page2, font, bold, 55, 680, [160, 140, 185], [
    ['Mô-đun (hư cấu)', 'Trạng thái (demo)', 'Chức năng minh hoạ'],
    ['Lõi xử lý DEMO', 'Hoạt động (demo)', 'Điều phối tác vụ mô phỏng, không nối hệ thống thật'],
    ['Bộ kết nối DEMO', 'Hoạt động (demo)', 'Trao đổi dữ liệu giả lập giữa hai ứng dụng mẫu'],
    ['Báo cáo DEMO', 'Hoạt động (demo)', 'Số liệu minh hoạ, không phải dữ liệu vận hành thật'],
    ['Giám sát DEMO', 'Thử nghiệm (demo)', 'Cảnh báo mẫu, không gửi thông báo thật'],
  ])
  page2.drawText('3. THÔNG TIN LIÊN HỆ (HƯ CẤU)', { x: 55, y: afterTable - 30, size: 13, font: bold, color: INK })
  page2.drawRectangle({ x: 55, y: afterTable - 110, width: 485, height: 68, borderColor: LINE, borderWidth: 1, color: FILL })
  const contact = ['Đơn vị demo: Ubot Demo — không phải pháp nhân thật', 'Email demo: (không phải địa chỉ thật)', 'Website demo: (không phải địa chỉ thật)']
  contact.forEach((line, i) => page2.drawText(line, { x: 68, y: afterTable - 52 - i * 18, size: 10, font, color: INK }))
  footer(page2, font)

  return new File([new Uint8Array(await doc.save())], 'ubot-tech-profile-demo.pdf', { type: 'application/pdf' })
}

/** Convert: "Hồ sơ năng lực LPC" — hồ sơ ngắn để thử công cụ Chuyển đổi tệp (PDF → Word/Excel/ảnh). */
export async function createPihLpcProfileSample(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const page = doc.addPage(PAGE)
  header(page, bold, font, 'Hồ sơ năng lực — tài liệu demo')
  page.drawText('HỒ SƠ NĂNG LỰC LPC (DEMO)', { x: 55, y: 712, size: 20, font: bold, color: INK })
  page.drawText('Công ty TNHH LPC Demo', { x: 55, y: 690, size: 12, font, color: MUTED })

  const afterInfo = table(page, font, bold, 55, 660, [170, 315], [
    ['Thông tin (giả lập)', 'Chi tiết'],
    ['Lĩnh vực', 'Giải pháp phần mềm quản trị doanh nghiệp'],
    ['Năm thành lập', '20XX (demo)'],
    ['Quy mô nhân sự', 'Khoảng một trăm người (demo)'],
  ])

  page.drawText('Năng lực tiêu biểu (minh hoạ)', { x: 55, y: afterInfo - 26, size: 13, font: bold, color: INK })
  const capabilities = [
    '- Triển khai phần mềm quản trị cho doanh nghiệp vừa và nhỏ (demo)',
    '- Tư vấn quy trình số hoá nội bộ (demo)',
    '- Hỗ trợ vận hành sau triển khai (demo)',
  ]
  capabilities.forEach((line, i) => page.drawText(line, { x: 55, y: afterInfo - 50 - i * 20, size: 11, font, color: INK }))

  const afterCap = afterInfo - 50 - capabilities.length * 20 - 10
  page.drawText('Dự án tiêu biểu (minh hoạ)', { x: 55, y: afterCap, size: 13, font: bold, color: INK })
  table(page, font, bold, 55, afterCap - 24, [240, 115, 130], [
    ['Tên dự án (hư cấu)', 'Quy mô (demo)', 'Thời gian (demo)'],
    ['Hệ thống quản trị Demo A', 'Trung bình', '6 tháng'],
    ['Hệ thống quản trị Demo B', 'Lớn', '12 tháng'],
  ])

  page.drawText('Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật của bất kỳ công ty nào.', { x: 55, y: 58, size: 8, font, color: MUTED })
  footer(page, font, '')
  return new File([new Uint8Array(await doc.save())], 'lpc-profile-demo.pdf', { type: 'application/pdf' })
}

/** PDF merge: ba trang rời "Brochure PIH" (bìa / nội dung / liên hệ) để thử công cụ Ghép PDF. */
export async function createPihBrochurePages(): Promise<File[]> {
  const builders: ((page: PDFPage, font: PDFFont, bold: PDFFont) => void)[] = [
    (page, font, bold) => {
      page.drawText('PI HOLDING', { x: 55, y: 700, size: 26, font: bold, color: INK })
      page.drawText('Brochure giới thiệu tập đoàn — tài liệu mẫu', { x: 55, y: 668, size: 13, font, color: MUTED })
      page.drawText('(không phải ấn phẩm chính thức)', { x: 55, y: 648, size: 10, font, color: MUTED })
      page.drawRectangle({ x: 55, y: 500, width: 485, height: 100, color: FILL, borderColor: LINE, borderWidth: 1 })
      page.drawText('Bấm "Ghép PDF" để gộp 3 trang mẫu này thành một tệp.', { x: 70, y: 540, size: 11, font, color: INK })
    },
    (page, font, bold) => {
      page.drawText('NỘI DUNG (DEMO)', { x: 55, y: 700, size: 18, font: bold, color: INK })
      table(page, font, bold, 55, 666, [220, 265], [
        ['Sản phẩm hư cấu', 'Lĩnh vực minh hoạ'],
        ['ERPCons Demo', 'Quản trị doanh nghiệp'],
        ['Tekshot Demo', 'Quản lý sản xuất'],
        ['Ubot Demo', 'Tự động hoá quy trình'],
        ['DocTools Demo', 'Công cụ tài liệu văn phòng'],
      ])
      page.drawText('Mọi tên gọi và số liệu trên trang này chỉ để thử tính năng ghép PDF.', { x: 55, y: 470, size: 10, font, color: MUTED })
    },
    (page, font, bold) => {
      page.drawText('LIÊN HỆ (DEMO)', { x: 55, y: 700, size: 18, font: bold, color: INK })
      page.drawRectangle({ x: 55, y: 600, width: 485, height: 86, color: FILL, borderColor: LINE, borderWidth: 1 })
      const contact = ['Website demo: (không phải địa chỉ thật)', 'Email demo: (không phải địa chỉ thật)', 'Hotline demo: (không phải số thật)']
      contact.forEach((line, i) => page.drawText(line, { x: 70, y: 660 - i * 20, size: 11, font, color: INK }))
      page.drawText('Đây là trang cuối của bộ 3 trang mẫu dùng để thử tính năng Ghép PDF.', { x: 55, y: 576, size: 10, font, color: MUTED })
    },
  ]
  const titles = ['BÌA (DEMO)', 'NỘI DUNG (DEMO)', 'LIÊN HỆ (DEMO)']
  const files: File[] = []
  for (const [index, build] of builders.entries()) {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Brochure PIH — trang ${index + 1}/3 (demo) — ${titles[index]}`)
    build(page, font, bold)
    footer(page, font)
    files.push(new File([new Uint8Array(await doc.save())], `brochure-pih-demo-${index + 1}.pdf`, { type: 'application/pdf' }))
  }
  return files
}

/** PDF split: một tệp nhiều trang (6 trang, nội dung khác nhau) "Brochure PIH" để thử công cụ Tách PDF. */
export async function createPihBrochureBooklet(): Promise<File> {
  const { doc, font, bold } = await baseDoc()
  const sections: { title: string; body: string[] }[] = [
    { title: 'BÌA (DEMO)', body: ['PI HOLDING', 'Brochure giới thiệu — tài liệu mẫu nhiều trang', 'Dùng để thử tính năng Tách PDF theo khoảng trang.'] },
    { title: 'GIỚI THIỆU (DEMO)', body: ['Tập đoàn hư cấu "PI Holding Demo" gồm nhiều sản phẩm minh hoạ,', 'mỗi trang trong tệp này giới thiệu một phần khác nhau.'] },
    { title: 'SẢN PHẨM 1 — ERPCONS DEMO', body: ['Lĩnh vực minh hoạ: quản trị doanh nghiệp.', 'Năng lực mẫu: quản lý dự án, tài chính nội bộ (demo).'] },
    { title: 'SẢN PHẨM 2 — TEKSHOT DEMO', body: ['Lĩnh vực minh hoạ: quản lý sản xuất, bán hàng.', 'Năng lực mẫu: điểm bán hàng, báo cáo kinh doanh (demo).'] },
    { title: 'SỐ LIỆU MINH HOẠ (DEMO)', body: ['Bảng dưới đây là số liệu giả lập, chỉ để thử tính năng tách trang:'] },
    { title: 'LIÊN HỆ (DEMO)', body: ['Website demo / Email demo / Hotline demo — không phải thông tin thật.', 'Kết thúc tệp mẫu 6 trang.'] },
  ]
  sections.forEach((section, i) => {
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Brochure PIH — tài liệu mẫu nhiều trang (demo) — trang ${i + 1}/6`)
    page.drawText(`TRANG ${i + 1} / 6 — ${section.title}`, { x: 55, y: 700, size: 16, font: bold, color: INK })
    section.body.forEach((line, j) => page.drawText(line, { x: 55, y: 660 - j * 22, size: 11, font, color: INK }))
    if (i === 4) table(page, font, bold, 55, 590, [240, 120, 125], [['Hạng mục (demo)', 'Đơn vị', 'Số lượng'], ['Mô-đun A (demo)', 'bộ', '1'], ['Mô-đun B (demo)', 'bộ', '2']])
    footer(page, font)
  })
  return new File([new Uint8Array(await doc.save())], 'brochure-pih-demo-booklet.pdf', { type: 'application/pdf' })
}

/** So sánh tài liệu: "Hợp đồng LPC A/B" — hai bản gần giống nhau với vài khác biệt cố ý, để thử công cụ So sánh PDF. */
export async function createPihContractPair(): Promise<[File, File]> {
  const common = [
    'HỢP ĐỒNG KHUNG (DEMO)',
    'Bên A: Công ty TNHH LPC Demo',
    'Bên B: Khách hàng Demo',
    '',
    'Điều 1. Phạm vi hợp tác (hư cấu)',
    'Hai bên hợp tác, cho mục đích minh hoạ, trong lĩnh vực phần mềm quản trị doanh nghiệp.',
    '',
    'Điều 2. Thời hạn (hư cấu)',
  ]
  async function build(extra: string[], suffix: 'a' | 'b') {
    const { doc, font, bold } = await baseDoc()
    const page = doc.addPage(PAGE)
    header(page, bold, font, `Hợp đồng LPC — bản ${suffix.toUpperCase()} (demo)`)
    const lines = [...common, ...extra]
    lines.forEach((line, i) => page.drawText(line, { x: 55, y: 700 - i * 20, size: 11, font, color: INK }))
    footer(page, font)
    return new File([new Uint8Array(await doc.save())], `lpc-contract-demo-${suffix}.pdf`, { type: 'application/pdf' })
  }
  const a = await build([
    'Hợp đồng có hiệu lực 12 tháng kể từ ngày ký (demo).', '',
    'Điều 3. Giá trị hợp đồng (hư cấu)', 'Giá trị mẫu: 100.000.000 đồng (một trăm triệu, số liệu demo).', '',
    'Điều 4. Trách nhiệm các bên (hư cấu)', 'Hai bên cam kết phối hợp cung cấp thông tin cần thiết (demo).',
  ], 'a')
  const b = await build([
    'Hợp đồng có hiệu lực 24 tháng kể từ ngày ký (demo).', '',
    'Điều 3. Giá trị hợp đồng (hư cấu)', 'Giá trị mẫu: 120.000.000 đồng (một trăm hai mươi triệu, số liệu demo).', '',
    'Điều 4. Trách nhiệm các bên (hư cấu)', 'Hai bên cam kết phối hợp cung cấp thông tin cần thiết (demo).', '',
    'Điều 5. Điều khoản bổ sung (hư cấu, mới ở bản B)', 'Hai bên đồng ý rà soát tiến độ theo quý (demo).',
  ], 'b')
  return [a, b]
}
