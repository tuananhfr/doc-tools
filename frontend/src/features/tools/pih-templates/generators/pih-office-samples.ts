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
  sheet.mergeCells('A1:E1')

  const header = ['Hạng mục (demo)', 'Đơn vị', 'Khối lượng', 'Đơn giá (đồng, demo)', 'Thành tiền']
  const headerRow = sheet.addRow(header)
  headerRow.font = { bold: true }

  const items: [string, string, number, number][] = [
    ['Mô-đun điều phối quy trình (demo)', 'bộ', 1, 50_000_000],
    ['Kết nối hệ thống mẫu A (demo)', 'điểm', 3, 8_000_000],
    ['Kết nối hệ thống mẫu B (demo)', 'điểm', 2, 8_000_000],
    ['Đào tạo vận hành (demo)', 'buổi', 4, 3_000_000],
  ]
  let firstRow = -1
  let lastRow = -1
  for (const [name, unit, qty, price] of items) {
    const r = sheet.addRow([name, unit, qty, price])
    if (firstRow === -1) firstRow = r.number
    lastRow = r.number
    r.getCell(5).value = { formula: `C${r.number}*D${r.number}` }
    r.getCell(4).numFmt = '#,##0'
    r.getCell(5).numFmt = '#,##0'
  }
  const totalRow = sheet.addRow(['TỔNG (demo)', '', '', '', { formula: `SUM(E${firstRow}:E${lastRow})` }])
  totalRow.font = { bold: true }
  totalRow.getCell(5).numFmt = '#,##0'

  sheet.columns.forEach((column, index) => { column.width = index === 0 ? 34 : 18 })
  sheet.addRow([])
  sheet.addRow(['Dữ liệu giả lập — chỉ để minh hoạ tính năng, không phải số liệu thật.'])

  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'boq-ubot-demo.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
