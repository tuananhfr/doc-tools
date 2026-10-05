import { readFileSync } from 'node:fs'
import fontkit from '@pdf-lib/fontkit'
import { PDFDict, PDFDocument, PDFHexString, PDFName, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { applyFormValues, describeForm, formSummary } from './pdf-form'

const FONT = readFileSync('src/assets/fonts/BeVietnamPro-Regular.ttf')

async function sampleForm() {
  const doc = await PDFDocument.create()
  const [first, second] = [doc.addPage([400, 500]), doc.addPage([400, 500])]
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const form = doc.getForm()
  const box = (y: number) => ({ x: 20, y, width: 200, height: 20, font: helvetica })

  const unit = form.createTextField('ho_so.don_vi')
  unit.addToPage(first, box(450))
  unit.setText('Cong ty cu')
  unit.acroField.dict.set(PDFName.of('TU'), PDFHexString.fromText('Đơn vị thi công'))
  const note = form.createTextField('ghi_chu')
  note.enableMultiline()
  note.addToPage(second, box(400))
  const code = form.createTextField('ma_so')
  code.setMaxLength(6)
  code.addToPage(first, box(410))
  const locked = form.createTextField('so_tt')
  locked.addToPage(first, box(370))
  locked.setText('07')
  locked.enableReadOnly()
  const signed = form.createCheckBox('da_ky')
  signed.addToPage(first, { x: 20, y: 330, width: 14, height: 14 })
  const method = form.createRadioGroup('hinh_thuc')
  method.addOptionToPage('tien_mat', first, { x: 20, y: 300, width: 14, height: 14 })
  method.addOptionToPage('chuyen_khoan', first, { x: 60, y: 300, width: 14, height: 14 })
  method.select('tien_mat')
  const phase = form.createDropdown('dot')
  phase.addOptions(['Dot 1', 'Dot 2'])
  phase.addToPage(first, box(260))
  const items = form.createOptionList('hang_muc')
  items.addOptions(['Mong', 'Than', 'Mai'])
  items.enableMultiselect()
  items.addToPage(second, { ...box(300), height: 60 })
  form.createButton('in').addToPage('In', second, box(200))
  return PDFDocument.load(await doc.save())
}

async function withFont(doc: PDFDocument, subset = false) {
  doc.registerFontkit(fontkit)
  return doc.embedFont(FONT, { subset })
}

describe('describeForm', () => {
  it('lists every fillable field with its value, pages and printed label', async () => {
    const info = describeForm(await sampleForm())
    expect(info.skipped).toBe(1)
    const byName = Object.fromEntries(info.fields.map((field) => [field.name, field]))
    expect(Object.keys(byName)).toEqual(['ho_so.don_vi', 'ghi_chu', 'ma_so', 'so_tt', 'da_ky', 'hinh_thuc', 'dot', 'hang_muc'])
    expect(byName['ho_so.don_vi']).toMatchObject({ kind: 'text', label: 'Đơn vị thi công', value: 'Cong ty cu', pages: [0] })
    expect(byName.ghi_chu).toMatchObject({ multiline: true, pages: [1] })
    expect(byName.ma_so.maxLength).toBe(6)
    expect(byName.so_tt).toMatchObject({ readOnly: true, value: '07' })
    expect(byName.da_ky).toMatchObject({ kind: 'checkbox', value: false })
    expect(byName.hinh_thuc).toMatchObject({ kind: 'radio', value: 'tien_mat', options: ['tien_mat', 'chuyen_khoan'] })
    expect(byName.dot).toMatchObject({ kind: 'dropdown', value: [], options: ['Dot 1', 'Dot 2'] })
    expect(byName.hang_muc).toMatchObject({ kind: 'list', multiSelect: true, pages: [1] })
  })

  it('counts fillable fields and spots XFA without touching the document', async () => {
    const doc = await sampleForm()
    doc.catalog.getAcroForm()!.dict.set(PDFName.of('XFA'), doc.context.obj([]))
    expect(formSummary(doc)).toEqual({ fields: 8, xfa: true })
    expect(doc.catalog.getAcroForm()!.dict.has(PDFName.of('XFA'))).toBe(true)
    expect(formSummary(await PDFDocument.create())).toBeUndefined()
  })
})

describe('applyFormValues', () => {
  it('writes Vietnamese values that survive a save and keeps the font for later typing', async () => {
    const doc = await sampleForm()
    const font = await withFont(doc)
    const written = applyFormValues(doc, {
      'ho_so.don_vi': 'Công ty Cổ phần Xây lắp Miền Trung',
      ghi_chu: 'Dòng một\nDòng hai',
      so_tt: '99',
      da_ky: true,
      hinh_thuc: 'chuyen_khoan',
      dot: ['Dot 2'],
      hang_muc: ['Mong', 'Mai'],
      khong_co: 'x',
    }, font)
    expect(written).toBe(6)

    const saved = await PDFDocument.load(await doc.save({ updateFieldAppearances: false }))
    const form = saved.getForm()
    expect(form.getTextField('ho_so.don_vi').getText()).toBe('Công ty Cổ phần Xây lắp Miền Trung')
    expect(form.getTextField('so_tt').getText()).toBe('07')
    expect(form.getCheckBox('da_ky').isChecked()).toBe(true)
    expect(form.getRadioGroup('hinh_thuc').getSelected()).toBe('chuyen_khoan')
    expect(form.getOptionList('hang_muc').getSelected().sort()).toEqual(['Mai', 'Mong'])

    const da = form.getTextField('ho_so.don_vi').acroField.getDefaultAppearance()
    expect(da).toContain(`/${font.name} 15 Tf`)
    expect(da).not.toContain('/Helv')
    const fonts = form.acroForm.dict.lookup(PDFName.of('DR'), PDFDict).lookup(PDFName.of('Font'), PDFDict)
    expect(fonts.has(PDFName.of(font.name))).toBe(true)
  })

  it('flattens the form into page content', async () => {
    const doc = await sampleForm()
    applyFormValues(doc, { 'ho_so.don_vi': 'Đã khoá' }, await withFont(doc, true), { flatten: true })
    const saved = await PDFDocument.load(await doc.save({ updateFieldAppearances: false }))
    expect(saved.getForm().getFields()).toHaveLength(0)
    expect(formSummary(saved)).toBeUndefined()
    const xObjects = saved.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict)
    expect(xObjects.keys().some((key) => key.toString().startsWith('/FlatWidget'))).toBe(true)
    // Không còn ô nào, và không còn ref trỏ vào đối tượng đã xoá.
    for (const page of saved.getPages()) {
      for (const item of page.node.Annots()?.asArray() ?? []) {
        const annot = saved.context.lookup(item)
        expect(annot).toBeInstanceOf(PDFDict)
        expect((annot as PDFDict).get(PDFName.of('Subtype'))?.toString()).not.toBe('/Widget')
      }
    }
  })
})
