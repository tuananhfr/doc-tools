// Fixture A2: PDF có sẵn form, annotation + liên kết, tệp đính kèm, layer (OCG).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { FIX } from '../lib/qa.mjs'

const require = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFString, PDFArray, StandardFonts, rgb } = require('pdf-lib')
const fontkit = require('@pdf-lib/fontkit')

const FONT = fs.readFileSync(new URL('../../../src/assets/fonts/BeVietnamPro-Regular.ttf', import.meta.url))

async function base(pages, title) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(FONT, { subset: false })
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842])
    page.drawText(`${title} — trang ${i + 1}/${pages}`, { x: 60, y: 780, size: 18, font })
  }
  return { doc, font }
}

// 1) Form AcroForm: chữ, ô đánh dấu, danh sách chọn, nút chọn một.
{
  const { doc, font } = await base(2, 'Phiếu đề nghị thanh toán')
  const form = doc.getForm()
  const p = doc.getPage(0)
  const label = (text, y) => p.drawText(text, { x: 60, y, size: 11, font })
  label('Đơn vị thi công', 712)
  const unit = form.createTextField('don_vi')
  unit.setText('Công ty Cổ phần Xây lắp Miền Trung')
  unit.addToPage(p, { x: 200, y: 700, width: 320, height: 22, font })
  label('Số hợp đồng', 672)
  const contract = form.createTextField('so_hop_dong')
  contract.setText('12/2026/HĐ-XL')
  contract.addToPage(p, { x: 200, y: 660, width: 160, height: 22, font })
  label('Đã ký nháy', 632)
  const signed = form.createCheckBox('da_ky_nhay')
  signed.addToPage(p, { x: 200, y: 626, width: 16, height: 16 })
  signed.check()
  label('Đợt thanh toán', 592)
  const phase = form.createDropdown('dot_thanh_toan')
  phase.addOptions(['Đợt 1', 'Đợt 2', 'Đợt 3'])
  phase.select('Đợt 2')
  phase.addToPage(p, { x: 200, y: 580, width: 120, height: 22, font })
  label('Hình thức', 552)
  const kind = form.createRadioGroup('hinh_thuc')
  kind.addOptionToPage('chuyen_khoan', p, { x: 200, y: 546, width: 14, height: 14 })
  kind.addOptionToPage('tien_mat', p, { x: 300, y: 546, width: 14, height: 14 })
  kind.select('chuyen_khoan')
  label('Ghi chú', 512)
  const note = form.createTextField('ghi_chu')
  note.enableMultiline()
  note.addToPage(p, { x: 200, y: 440, width: 320, height: 64, font })
  form.updateFieldAppearances(font)
  // Như form soạn bằng Acrobat: cỡ chữ Auto (0). pdf-lib lúc addToPage ghi cứng cỡ đã tính vào DA.
  for (const field of [unit, note]) {
    const auto = (da) => da.replace(/([\d.]+) Tf/, '0 Tf')
    field.acroField.setDefaultAppearance(auto(field.acroField.getDefaultAppearance() ?? '/Helv 0 Tf 0 g'))
    for (const widget of field.acroField.getWidgets()) if (widget.getDefaultAppearance()) widget.setDefaultAppearance(auto(widget.getDefaultAppearance()))
  }
  fs.writeFileSync(FIX + 'ho-so-form.pdf', await doc.save({ updateFieldAppearances: false }))
}

// 1b) Nhóm radio xếp DỌC ở cuối trang: đẩy xuống là chỗ cắt trang rơi vào giữa các nút.
{
  const { doc, font } = await base(1, 'Phiếu chọn hình thức thanh toán')
  const form = doc.getForm()
  const p = doc.getPage(0)
  p.drawText('Người đề nghị', { x: 60, y: 700, size: 11, font })
  const who = form.createTextField('nguoi_de_nghi')
  who.setText('Trần Văn Bình')
  who.addToPage(p, { x: 200, y: 694, width: 250, height: 20, font })
  const kind = form.createRadioGroup('hinh_thuc')
  for (const [key, text, y] of [['chuyen_khoan', 'Chuyển khoản', 164], ['tien_mat', 'Tiền mặt', 142], ['bu_tru', 'Bù trừ công nợ', 120]]) {
    p.drawText(text, { x: 60, y, size: 11, font })
    kind.addOptionToPage(key, p, { x: 200, y: y - 4, width: 14, height: 14 })
  }
  kind.select('tien_mat')
  form.updateFieldAppearances(font)
  fs.writeFileSync(FIX + 'phieu-radio.pdf', await doc.save({ updateFieldAppearances: false }))
}

// 2) Annotation có sẵn: ghi chú dính, khung, tô sáng, liên kết nội bộ + liên kết web.
{
  const { doc } = await base(3, 'Biên bản kiểm tra hiện trường')
  const ctx = doc.context
  const pages = doc.getPages()
  const ap = (w, h, ops) => ctx.register(ctx.flateStream(ops, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, w, h] }))
  const add = (page, dict) => page.node.addAnnot(ctx.register(ctx.obj(dict)))
  add(pages[0], { Type: 'Annot', Subtype: 'Square', Rect: [60, 600, 260, 700], C: [0.9, 0.1, 0.1], Border: [0, 0, 2], Contents: PDFString.of('Vùng nứt'), AP: { N: ap(200, 100, '0.9 0.1 0.1 RG 2 w 1 1 198 98 re S') } })
  add(pages[0], { Type: 'Annot', Subtype: 'Text', Rect: [300, 680, 320, 700], Contents: PDFString.of('Cần đo lại'), Name: 'Comment', C: [1, 0.8, 0] })
  add(pages[0], { Type: 'Annot', Subtype: 'Highlight', Rect: [58, 776, 400, 800], QuadPoints: [58, 800, 400, 800, 58, 776, 400, 776], C: [1, 1, 0], AP: { N: ap(342, 24, '/GS0 gs 1 1 0 rg 0 0 342 24 re f') } })
  // Liên kết tới trang 3 bằng tham chiếu trang — trang 3 không được xuất thì liên kết chết.
  add(pages[0], { Type: 'Annot', Subtype: 'Link', Rect: [60, 540, 260, 560], Border: [0, 0, 1], C: [0, 0, 1], Dest: [pages[2].ref, PDFName.of('Fit')] })
  pages[0].drawText('Xem trang 3', { x: 64, y: 545, size: 12 })
  add(pages[0], { Type: 'Annot', Subtype: 'Link', Rect: [60, 500, 260, 520], Border: [0, 0, 1], A: { S: 'URI', URI: PDFString.of('https://erpcons.vn') } })
  add(pages[1], { Type: 'Annot', Subtype: 'Link', Rect: [60, 540, 260, 560], Border: [0, 0, 1], Dest: [pages[0].ref, PDFName.of('Fit')] })
  fs.writeFileSync(FIX + 'co-annot.pdf', await doc.save())
}

// 3) Tệp đính kèm cấp tài liệu.
{
  const { doc } = await base(1, 'Hồ sơ thanh toán có đính kèm')
  await doc.attach(Buffer.from('Ma;Vat tu;KL\n0123;Xi mang;42.5\n'), 'bang-ke.csv', { mimeType: 'text/csv', description: 'Bảng kê khối lượng' })
  await doc.attach(Buffer.from('%PDF-1.4 fake'), 'phu-luc.pdf', { mimeType: 'application/pdf' })
  fs.writeFileSync(FIX + 'dinh-kem.pdf', await doc.save())
}

// 4) Layer (OCG): "Kích thước" bật, "Ghi chú nội bộ" TẮT mặc định.
{
  const doc = await PDFDocument.create()
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const ctx = doc.context
  const ocOn = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('Kich thuoc') }))
  const ocOff = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('Ghi chu noi bo') }))
  doc.catalog.set(PDFName.of('OCProperties'), ctx.obj({ OCGs: [ocOn, ocOff], D: { Order: [ocOn, ocOff], ON: [ocOn], OFF: [ocOff] } }))
  for (let i = 0; i < 2; i++) {
    const page = doc.addPage([595, 842])
    page.drawText(`Ban ve layer - trang ${i + 1}`, { x: 60, y: 780, size: 18, font: helv, color: rgb(0, 0, 0) })
    const fontKey = page.node.Resources().lookup(PDFName.of('Font')).keys()[0].asString()
    const props = ctx.obj({ oc1: ocOn, oc2: ocOff })
    page.node.Resources().set(PDFName.of('Properties'), props)
    const ops = `/OC /oc1 BDC BT ${fontKey} 14 Tf 60 700 Td (KICH THUOC 6000) Tj ET EMC /OC /oc2 BDC 1 0 0 rg BT ${fontKey} 14 Tf 60 660 Td (GHI CHU NOI BO - KHONG IN) Tj ET EMC`
    const stream = ctx.register(ctx.flateStream(ops))
    const contents = page.node.lookup(PDFName.of('Contents'))
    const arr = contents instanceof PDFArray ? contents : ctx.obj([page.node.get(PDFName.of('Contents'))])
    arr.push(stream)
    page.node.set(PDFName.of('Contents'), arr)
  }
  fs.writeFileSync(FIX + 'lop.pdf', await doc.save())
}
console.log('ok')
