/**
 * Mẫu Word / Excel cho PI Holding — sinh hoàn toàn trên trình duyệt bằng thư viện đã có sẵn
 * trong repo (`docx`, `exceljs`), KHÔNG đụng tới WordCraft/GridCraft (engine vendor). Không có
 * cách đã xác minh để nạp sẵn nội dung vào iframe của hai engine đó (chúng nạp một
 * `index.html` tĩnh, không có tham số hay `postMessage` nào được quan sát thấy) — nên lối vào
 * duy nhất an toàn là: tạo tệp mẫu mới mỗi lần (không phải bản dùng chung), cho tải xuống, và
 * người dùng tự mở nó bằng nút "Mở tệp" sẵn có bên trong trình soạn thảo. Đây KHÔNG phải một
 * giả định về cách engine hoạt động — chỉ là không sửa engine, không tiêm nội dung vào iframe.
 */

const DOC_TITLE = 'Hồ sơ năng lực LPC (demo)'

/** Word: "Hồ sơ năng lực LPC" — vài đoạn + một bảng ngắn, tất cả số liệu giả lập. */
export async function createPihLpcProfileDocx(): Promise<File> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import('docx')
  const row = (a: string, b: string) => new TableRow({ children: [
    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: a, bold: true })] })] }),
    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph(b)] }),
  ] })
  const doc = new Document({
    title: DOC_TITLE,
    sections: [{
      children: [
        new Paragraph({ text: 'PI HOLDING — MẪU ĐỂ THỬ', heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: DOC_TITLE, heading: HeadingLevel.TITLE }),
        new Paragraph('Công ty TNHH LPC Demo — tài liệu minh hoạ để thử tính năng soạn thảo Word. Mọi số liệu dưới đây là dữ liệu giả lập, không phải thông tin thật của bất kỳ công ty nào.'),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          row('Lĩnh vực (giả lập)', 'Giải pháp phần mềm quản trị doanh nghiệp'),
          row('Năm thành lập (giả lập)', '20XX'),
          row('Quy mô nhân sự (giả lập)', 'Khoảng một trăm người'),
        ] }),
        new Paragraph(' '),
        new Paragraph({ text: 'Năng lực tiêu biểu (minh hoạ)', heading: HeadingLevel.HEADING_2 }),
        new Paragraph('- Triển khai phần mềm quản trị cho doanh nghiệp vừa và nhỏ (demo)'),
        new Paragraph('- Tư vấn quy trình số hoá nội bộ (demo)'),
        new Paragraph('- Hỗ trợ vận hành sau triển khai (demo)'),
        new Paragraph('- Đào tạo đội ngũ vận hành hệ thống (demo)'),
        new Paragraph(' '),
        new Paragraph({ text: 'Dự án tiêu biểu (minh hoạ)', heading: HeadingLevel.HEADING_2 }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Tên dự án (hư cấu)', bold: true })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Quy mô (demo)', bold: true })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: 'Thời gian (demo)', bold: true })] })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph('Hệ thống quản trị Demo A')] }),
            new TableCell({ children: [new Paragraph('Trung bình')] }),
            new TableCell({ children: [new Paragraph('6 tháng')] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph('Hệ thống quản trị Demo B')] }),
            new TableCell({ children: [new Paragraph('Lớn')] }),
            new TableCell({ children: [new Paragraph('12 tháng')] }),
          ] }),
        ] }),
        new Paragraph(' '),
        new Paragraph({ text: 'Thông tin liên hệ (hư cấu)', heading: HeadingLevel.HEADING_2 }),
        new Paragraph('Email demo: (không phải địa chỉ thật) — Website demo: (không phải địa chỉ thật)'),
        new Paragraph(' '),
        new Paragraph({ children: [new TextRun({ text: 'Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.', italics: true, size: 18 })] }),
      ],
    }],
  })
  return new File([await Packer.toBlob(doc)], 'lpc-profile-demo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

/** Excel: "BOQ Ubot" — bảng khối lượng dự toán giả lập, để thử tính năng bảng tính/công thức. */
export async function createPihUbotBoqXlsx(): Promise<File> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PI Holding — mẫu để thử'
  workbook.title = 'BOQ Ubot (demo)'
  const sheet = workbook.addWorksheet('BOQ Ubot (demo)')

  sheet.getCell('A1').value = 'BẢNG KHỐI LƯỢNG DỰ TOÁN — UBOT DEMO (SỐ LIỆU GIẢ LẬP)'
  sheet.getCell('A1').font = { bold: true, size: 13 }
  sheet.mergeCells('A1:F1')

  const header = ['Hạng mục (demo)', 'Nhóm (demo)', 'Đơn vị', 'Khối lượng', 'Đơn giá (đồng, demo)', 'Thành tiền']
  const headerRow = sheet.addRow(header)
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E8C' } }
    cell.alignment = { vertical: 'middle' }
  })

  const items: [string, string, string, number, number][] = [
    ['Mô-đun điều phối quy trình (demo)', 'Phần mềm', 'bộ', 1, 50_000_000],
    ['Kết nối hệ thống mẫu A (demo)', 'Tích hợp', 'điểm', 3, 8_000_000],
    ['Kết nối hệ thống mẫu B (demo)', 'Tích hợp', 'điểm', 2, 8_000_000],
    ['Mô-đun báo cáo tổng hợp (demo)', 'Phần mềm', 'bộ', 1, 30_000_000],
    ['Khảo sát hiện trạng (demo)', 'Tư vấn', 'ngày', 5, 2_500_000],
    ['Đào tạo vận hành (demo)', 'Đào tạo', 'buổi', 4, 3_000_000],
    ['Bảo trì năm đầu (demo)', 'Hỗ trợ', 'năm', 1, 15_000_000],
  ]
  let firstRow = -1
  let lastRow = -1
  for (const [name, group, unit, qty, price] of items) {
    const r = sheet.addRow([name, group, unit, qty, price])
    if (firstRow === -1) firstRow = r.number
    lastRow = r.number
    r.getCell(6).value = { formula: `D${r.number}*E${r.number}` }
    r.getCell(5).numFmt = '#,##0'
    r.getCell(6).numFmt = '#,##0'
    r.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE1E6EF' } } } })
  }
  const totalRow = sheet.addRow(['TỔNG (demo)', '', '', '', '', { formula: `SUM(F${firstRow}:F${lastRow})` }])
  totalRow.font = { bold: true }
  totalRow.getCell(6).numFmt = '#,##0'
  totalRow.eachCell(cell => { cell.border = { top: { style: 'medium', color: { argb: 'FF1F4E8C' } } } })

  sheet.columns.forEach((column, index) => { column.width = index === 0 ? 34 : index === 1 ? 16 : 18 })
  sheet.addRow([])
  const notesRow = sheet.addRow(['Ghi chú (demo): số liệu trên là dữ liệu giả lập để thử tính năng bảng tính, không phải dự toán thật.'])
  notesRow.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
  sheet.addRow(['Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.'])

  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'boq-ubot-demo.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * PowerPoint: "Hệ sinh thái PIH" — 4 slide dựng bằng text box/hình khối (không ảnh), đủ để thử
 * DeckCraft mà không kéo theo nhánh xử lý ảnh của pptxgenjs (gói `image-size` kèm theo có advisory
 * DoS khi parse ảnh JXL/HEIF/ICNS — không chạm tới vì generator này không gọi `addImage`).
 */
export async function createPihOfficeEcosystemPptx(): Promise<File> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.author = 'PI Holding — mẫu để thử'
  pptx.title = 'PI Holding ecosystem (demo)'

  const navy = '1F2937'
  const accent = '2563EB'
  const muted = '6B7280'

  const cover = pptx.addSlide()
  cover.background = { color: navy }
  cover.addText('PI HOLDING — MẪU ĐỂ THỬ', { x: 0.6, y: 1.6, w: 9, h: 0.5, fontSize: 14, color: accent, bold: true })
  cover.addText('Hệ sinh thái PIH / ERPCons (demo)', { x: 0.6, y: 2.1, w: 9, h: 1, fontSize: 32, color: 'FFFFFF', bold: true })
  cover.addText('Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.', { x: 0.6, y: 4.8, w: 9, h: 0.5, fontSize: 12, color: muted, italic: true })

  const diagram = pptx.addSlide()
  diagram.addText('Sơ đồ hệ sinh thái (minh hoạ)', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, bold: true, color: navy })
  const boxes: [string, string][] = [['ERPCons Demo', 'Quản trị DN (demo)'], ['Tekshot Demo', 'Sản xuất & bán hàng (demo)'], ['Ubot Demo', 'Tự động hoá (demo)'], ['DocTools Demo', 'Tài liệu văn phòng (demo)']]
  boxes.forEach(([label, sub], i) => {
    diagram.addShape(pptx.ShapeType.roundRect, { x: 0.5 + i * 2.3, y: 2, w: 2, h: 1.1, fill: { color: i % 2 === 0 ? accent : '0EA5E9' }, line: { color: 'FFFFFF' }, rectRadius: 0.1 })
    diagram.addText([{ text: label, options: { breakLine: true, bold: true, fontSize: 13 } }, { text: sub, options: { fontSize: 9 } }], { x: 0.5 + i * 2.3, y: 2, w: 2, h: 1.1, color: 'FFFFFF', align: 'center', valign: 'middle' })
    if (i < boxes.length - 1) diagram.addText('→', { x: 2.5 + i * 2.3, y: 2, w: 0.3, h: 1.1, fontSize: 18, color: muted, align: 'center', valign: 'middle' })
  })
  diagram.addText('Tên sản phẩm/tổ chức đều là giả lập, không phản ánh cơ cấu hay dữ liệu thật.', { x: 0.5, y: 4.6, w: 9, h: 0.5, fontSize: 11, color: muted, italic: true })

  const highlights = pptx.addSlide()
  highlights.addText('Điểm nổi bật (minh hoạ)', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, bold: true, color: navy })
  const bullets: [string, string[]][] = [
    ['ERPCons Demo', ['Quản trị dự án và tài chính (ví dụ minh hoạ)', 'Kết nối dữ liệu nội bộ giữa các phòng ban (demo)']],
    ['Tekshot Demo', ['Điểm bán hàng và báo cáo kinh doanh (demo)', 'Quảng cáo và nội dung tự động hoá (demo)']],
    ['Ubot Demo', ['Thiết kế và dự toán công trình (demo)', 'Kiểm tra bản vẽ tự động (demo)']],
  ]
  bullets.forEach(([title, items], i) => {
    const y = 1.1 + i * 1.2
    highlights.addText(title, { x: 0.6, y, w: 8.8, h: 0.4, fontSize: 15, bold: true, color: accent })
    highlights.addText(items.map(text => ({ text, options: { bullet: true, breakLine: true } })), { x: 0.9, y: y + 0.4, w: 8.5, h: 0.7, fontSize: 12, color: navy })
  })

  const metrics = pptx.addSlide()
  metrics.addText('Số liệu minh hoạ (demo)', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, bold: true, color: navy })
  const bars: [string, number][] = [['ERPCons Demo', 80], ['Tekshot Demo', 65], ['Ubot Demo', 45], ['DocTools Demo', 30]]
  const maxW = 6
  bars.forEach(([label, pct], i) => {
    const y = 1.3 + i * 0.9
    metrics.addText(label, { x: 0.6, y, w: 2.2, h: 0.5, fontSize: 12, color: navy, valign: 'middle' })
    metrics.addShape(pptx.ShapeType.rect, { x: 2.9, y: y + 0.05, w: maxW, h: 0.4, fill: { color: 'E5E7EB' } })
    metrics.addShape(pptx.ShapeType.rect, { x: 2.9, y: y + 0.05, w: (maxW * pct) / 100, h: 0.4, fill: { color: i % 2 === 0 ? accent : '0EA5E9' } })
    metrics.addText(`${pct}% (demo)`, { x: 2.9 + maxW + 0.15, y, w: 1, h: 0.5, fontSize: 11, color: muted, valign: 'middle' })
  })
  metrics.addText('Tỉ lệ minh hoạ mức độ sử dụng mẫu giữa các sản phẩm — số liệu giả lập, không phải dữ liệu vận hành thật.', { x: 0.5, y: 4.9, w: 9, h: 0.5, fontSize: 10, color: muted, italic: true })

  const closing = pptx.addSlide()
  closing.addText('Lưu ý dữ liệu', { x: 0.6, y: 1.8, w: 9, h: 0.6, fontSize: 22, bold: true, color: navy })
  closing.addText('Toàn bộ tên công ty, số liệu và sơ đồ trong tệp này là dữ liệu giả lập, dựng để minh hoạ tính năng trình chiếu. Không phải thông tin thật của bất kỳ tổ chức nào.', { x: 0.6, y: 2.5, w: 8.8, h: 1.2, fontSize: 13, color: muted })

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob
  return new File([blob], 'pih-ecosystem-demo.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}
