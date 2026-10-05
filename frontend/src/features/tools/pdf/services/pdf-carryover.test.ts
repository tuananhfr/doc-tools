import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString, StandardFonts, type PDFPage } from 'pdf-lib'
import { carryoverSummary, NO_CARRYOVER } from '../utils/carryover-summary'
import { finishCarryover, prepareSource, pruneFormToPages, radioGroupKey, type PlacedPage } from './pdf-carryover'

/** Mô phỏng `assemblePdf`: chép theo lô, trang lặp lại thì chép thêm bản mới. */
async function rebuild(bytes: Uint8Array, order: number[]) {
  const doc = await PDFDocument.load(bytes)
  const prepared = prepareSource(doc, 'src', order)
  const output = await PDFDocument.create()
  const unique = [...new Set(order)]
  const batch = new Map((await output.copyPages(doc, unique)).map((page, position) => [unique[position], page]))
  const placed: PlacedPage[] = []
  for (const index of order) {
    let page: PDFPage | undefined = batch.get(index)
    if (page) batch.delete(index)
    else [page] = await output.copyPages(doc, [index])
    output.addPage(page)
    placed.push({ page, sourceKey: 'src', pageIndex: index })
  }
  const report = finishCarryover(output, [prepared], placed)
  const saved = await PDFDocument.load(await output.save())
  return { report, saved }
}

async function pagesDoc(count: number) {
  const doc = await PDFDocument.create()
  for (let index = 0; index < count; index++) doc.addPage([300, 400])
  return doc
}

function annotsOf(doc: PDFDocument, pageIndex: number): PDFDict[] {
  const annots = doc.getPage(pageIndex).node.Annots()
  return annots ? annots.asArray().map((item) => doc.context.lookup(item) as PDFDict) : []
}

function pageObjects(doc: PDFDocument): number {
  return doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFDict && object.get(PDFName.of('Type'))?.toString() === '/Page').length
}

describe('forms', () => {
  it('keeps fields working and renames the copy of a duplicated form page', async () => {
    const doc = await pagesDoc(2)
    const form = doc.getForm()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    const field = form.createTextField('contract')
    field.setText('12/2026')
    field.addToPage(doc.getPage(0), { x: 20, y: 300, width: 150, height: 20, font: helvetica })
    const box = form.createCheckBox('signed')
    box.check()
    box.addToPage(doc.getPage(0), { x: 20, y: 260, width: 12, height: 12 })

    const { report, saved } = await rebuild(await doc.save(), [0, 0, 1])
    expect(report).toMatchObject({ fields: 4, renamedFields: 2 })
    const out = saved.getForm()
    expect(out.getTextField('contract').getText()).toBe('12/2026')
    expect(out.getTextField('contract_2').getText()).toBe('12/2026')
    expect(out.getCheckBox('signed_2').isChecked()).toBe(true)
    expect(pageObjects(saved)).toBe(3)
    expect(annotsOf(saved, 1)[0].get(PDFName.of('P'))?.toString()).toBe(saved.getPage(1).ref.toString())
  })

  it('drops widgets of pages that were not exported', async () => {
    const doc = await pagesDoc(2)
    const form = doc.getForm()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    form.createTextField('first').addToPage(doc.getPage(0), { x: 20, y: 300, width: 150, height: 20, font: helvetica })
    form.createTextField('second').addToPage(doc.getPage(1), { x: 20, y: 300, width: 150, height: 20, font: helvetica })

    const { report, saved } = await rebuild(await doc.save(), [1])
    expect(report.fields).toBe(1)
    expect(saved.getForm().getFields().map((item) => item.getName())).toEqual(['second'])
    // Không có bản sao mồ côi của trang 1 chui vào tệp qua /P của ô nhập.
    expect(pageObjects(saved)).toBe(1)
  })

  it('splits the form between two files built from the same page', async () => {
    const doc = await pagesDoc(1)
    const form = doc.getForm()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    const upper = form.createTextField('upper')
    upper.setText('stays')
    upper.addToPage(doc.getPage(0), { x: 20, y: 300, width: 150, height: 20, font: helvetica })
    const lower = form.createTextField('lower')
    lower.setText('moves')
    lower.addToPage(doc.getPage(0), { x: 20, y: 60, width: 150, height: 20, font: helvetica })
    const bytes = await doc.save()

    // Như sửa chữ tràn trang: hai tệp cùng gốc, mỗi tệp gỡ ô không thuộc về nó khỏi /Annots.
    const half = async (drop: number) => {
      const part = await PDFDocument.load(bytes)
      part.getPage(0).node.Annots()?.remove(drop)
      pruneFormToPages(part)
      return PDFDocument.load(await part.save())
    }
    const [first, second] = [await half(1), await half(0)]
    expect(first.getForm().getFields().map((item) => item.getName())).toEqual(['upper'])
    expect(second.getForm().getFields().map((item) => item.getName())).toEqual(['lower'])
    expect(second.getForm().getTextField('lower').getText()).toBe('moves')

    const output = await PDFDocument.create()
    const placed: PlacedPage[] = []
    const prepared = []
    for (const [key, part] of [['a', first], ['b', second]] as const) {
      prepared.push(prepareSource(part, key, [0]))
      const [page] = await output.copyPages(part, [0])
      output.addPage(page)
      placed.push({ page, sourceKey: key, pageIndex: 0 })
    }
    expect(finishCarryover(output, prepared, placed)).toMatchObject({ fields: 2, renamedFields: 0 })
  })

  it('tells the buttons of one radio group apart from every other widget', async () => {
    const doc = await pagesDoc(1)
    const form = doc.getForm()
    const page = doc.getPage(0)
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    form.createTextField('name').addToPage(page, { x: 20, y: 300, width: 150, height: 20, font: helvetica })
    const method = form.createRadioGroup('method')
    method.addOptionToPage('cash', page, { x: 20, y: 200, width: 12, height: 12 })
    method.addOptionToPage('transfer', page, { x: 20, y: 180, width: 12, height: 12 })
    const twice = form.createCheckBox('agreed')
    twice.addToPage(page, { x: 20, y: 120, width: 12, height: 12 })
    twice.addToPage(page, { x: 20, y: 100, width: 12, height: 12 })

    const loaded = await PDFDocument.load(await doc.save({ updateFieldAppearances: false }))
    const keys = annotsOf(loaded, 0).map((annot) => radioGroupKey(loaded, annot))
    expect(keys.map((key) => typeof key)).toEqual(['undefined', 'string', 'string', 'undefined', 'undefined'])
    expect(keys[1]).toBe(keys[2])
  })
})

describe('links', () => {
  async function linked() {
    const doc = await pagesDoc(3)
    const ctx = doc.context
    const pages = doc.getPages()
    const link = (from: number, dest: unknown[]) =>
      pages[from].node.addAnnot(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10], Dest: dest as never })))
    link(0, [pages[2].ref, 'Fit'])
    link(1, [pages[0].ref, 'XYZ', 0, 400, 0])
    return doc
  }

  it('points kept links at the new pages and drops links to pages left out', async () => {
    const { report, saved } = await rebuild(await (await linked()).save(), [1, 0])
    expect(report.droppedLinks).toBe(1)
    // Trang 0 (giờ là trang 2 của tệp ra) mất liên kết; trang 1 (trang đầu) trỏ đúng trang 0 mới.
    expect(annotsOf(saved, 1)).toHaveLength(0)
    const [kept] = annotsOf(saved, 0)
    const dest = kept.lookup(PDFName.of('Dest'), PDFArray)
    expect((dest.get(0) as PDFRef).toString()).toBe(saved.getPage(1).ref.toString())
    expect(dest.get(1).toString()).toBe('/XYZ')
    expect(pageObjects(saved)).toBe(2)
  })

  it('resolves named destinations', async () => {
    const doc = await pagesDoc(2)
    const ctx = doc.context
    doc.catalog.set(PDFName.of('Dests'), ctx.obj({ chuong2: [doc.getPage(1).ref, 'Fit'] }))
    doc.getPage(0).node.addAnnot(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10], Dest: PDFName.of('chuong2') })))
    const { report, saved } = await rebuild(await doc.save(), [0, 1])
    expect(report.droppedLinks).toBe(0)
    const dest = annotsOf(saved, 0)[0].lookup(PDFName.of('Dest'), PDFArray)
    expect((dest.get(0) as PDFRef).toString()).toBe(saved.getPage(1).ref.toString())
  })

  it('strips scripts riding on annotations', async () => {
    const doc = await pagesDoc(1)
    const ctx = doc.context
    doc.getPage(0).node.addAnnot(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 10, 10], A: { S: 'JavaScript', JS: PDFString.of('app.alert(1)') } })))
    const { report, saved } = await rebuild(await doc.save(), [0])
    expect(report.removedScripts).toBe(1)
    expect(annotsOf(saved, 0)[0].has(PDFName.of('A'))).toBe(false)
  })
})

describe('attachments and layers', () => {
  it('carries embedded files', async () => {
    const doc = await pagesDoc(1)
    await doc.attach(new Uint8Array([1, 2, 3]), 'bang-ke.csv', { mimeType: 'text/csv' })
    await doc.attach(new Uint8Array([4]), 'a-phu-luc.pdf', { mimeType: 'application/pdf' })
    const { report, saved } = await rebuild(await doc.save(), [0])
    expect(report.attachments).toBe(2)
    const tree = saved.catalog.lookup(PDFName.of('Names'), PDFDict).lookup(PDFName.of('EmbeddedFiles'), PDFDict)
    const names = tree.lookup(PDFName.of('Names'), PDFArray)
    expect([0, 2].map((index) => (saved.context.lookup(names.get(index)) as PDFString).decodeText())).toEqual(['a-phu-luc.pdf', 'bang-ke.csv'])
  })

  it('keeps a layer hidden by default hidden, and only layers the pages still use', async () => {
    const doc = await pagesDoc(2)
    const ctx = doc.context
    const shown = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('Kich thuoc') }))
    const hidden = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('Noi bo') }))
    const unused = ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of('Trang khac') }))
    doc.catalog.set(PDFName.of('OCProperties'), ctx.obj({ OCGs: [shown, hidden, unused], D: { Order: [shown, hidden, unused], OFF: [hidden] } }))
    doc.getPage(0).node.Resources()!.set(PDFName.of('Properties'), ctx.obj({ a: shown, b: hidden }))
    doc.getPage(1).node.Resources()!.set(PDFName.of('Properties'), ctx.obj({ c: unused }))

    const { report, saved } = await rebuild(await doc.save(), [0])
    expect(report.layers).toBe(2)
    const properties = saved.catalog.lookup(PDFName.of('OCProperties'), PDFDict)
    const off = properties.lookup(PDFName.of('D'), PDFDict).lookup(PDFName.of('OFF'), PDFArray)
    expect(off.size()).toBe(1)
    expect((saved.context.lookup(off.get(0)) as PDFDict).lookup(PDFName.of('Name'), PDFString).decodeText()).toBe('Noi bo')
    // Nhãn tạm dùng để dò lại layer sau khi chép không được rò vào tệp.
    expect(saved.context.enumerateIndirectObjects().some(([, object]) => object instanceof PDFDict && object.has(PDFName.of('ErpLayer')))).toBe(false)
  })
})

describe('carryoverSummary', () => {
  it('says nothing for a plain document', () => {
    expect(carryoverSummary(NO_CARRYOVER)).toBeNull()
  })

  it('lists what was kept and warns about what no longer holds', () => {
    expect(carryoverSummary({ ...NO_CARRYOVER, fields: 6, attachments: 2 })).toEqual({ tone: 'info', text: 'Đã giữ 6 trường form, 2 tệp đính kèm.' })
    const signed = carryoverSummary({ ...NO_CARRYOVER, signatures: 1, droppedLinks: 2 })
    expect(signed?.tone).toBe('warning')
    expect(signed?.text).toBe('Bỏ 2 liên kết trỏ tới trang không xuất. 1 chữ ký số không còn hiệu lực ở tệp mới — cần ký lại nếu nộp đi.')
  })
})
