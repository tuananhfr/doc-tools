// Soi cấu trúc một PDF: form, annotation (liên kết còn sống không), tệp đính kèm, layer.
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } = require('pdf-lib')

export async function inspect(bytes) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pageRefs = doc.getPages().map((page) => page.ref.toString())
  const pages = doc.getPages().map((page) => {
    const annots = page.node.Annots()
    const list = []
    for (let i = 0; annots && i < annots.size(); i++) {
      const annot = annots.lookup(i, PDFDict)
      const subtype = annot.get(PDFName.of('Subtype'))?.toString()
      const item = { subtype }
      // Khung nằm trọn trong trang không — ô form / ghi chú bị đẩy ra ngoài trang thì vẫn còn trong tệp mà không ai thấy.
      const rect = annot.lookup(PDFName.of('Rect'))
      if (rect instanceof PDFArray && rect.size() === 4) {
        const [x1, y1, x2, y2] = [0, 1, 2, 3].map((at) => rect.lookup(at).asNumber())
        const box = page.getCropBox()
        item.inside = Math.min(x1, x2) >= box.x - 0.5 && Math.min(y1, y2) >= box.y - 0.5 && Math.max(x1, x2) <= box.x + box.width + 0.5 && Math.max(y1, y2) <= box.y + box.height + 0.5
      }
      const dest = annot.lookup(PDFName.of('Dest'))
      if (dest instanceof PDFArray) {
        const target = dest.get(0)
        item.dest = target instanceof PDFRef ? (pageRefs.includes(target.toString()) ? `page ${pageRefs.indexOf(target.toString()) + 1}` : 'DANGLING') : String(target)
      }
      if (subtype === '/Widget') {
        const parent = annot.lookup(PDFName.of('Parent'))
        item.field = (annot.lookup(PDFName.of('T')) ?? parent?.lookup?.(PDFName.of('T')))?.decodeText?.()
      }
      list.push(item)
    }
    return list
  })
  let fields = []
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'))
  if (acro) {
    fields = doc.getForm().getFields().map((field) => {
      const name = field.getName()
      let value = null
      const kind = field.constructor.name
      try {
        if (kind === 'PDFTextField') value = field.getText() ?? ''
        else if (kind === 'PDFCheckBox') value = field.isChecked()
        else if (kind === 'PDFDropdown') value = field.getSelected()
        else if (kind === 'PDFRadioGroup') value = field.getSelected()
      } catch (error) {
        value = `ERR ${error.message}`
      }
      return { name, kind, value }
    })
  }
  const names = doc.catalog.lookup(PDFName.of('Names'))
  const files = []
  const embedded = names?.lookup?.(PDFName.of('EmbeddedFiles'))
  const collect = (node) => {
    const arr = node?.lookup?.(PDFName.of('Names'))
    for (let i = 0; arr && i < arr.size(); i += 2) files.push(arr.lookup(i).decodeText())
    const kids = node?.lookup?.(PDFName.of('Kids'))
    for (let i = 0; kids && i < kids.size(); i++) collect(kids.lookup(i))
  }
  collect(embedded)
  const oc = doc.catalog.lookup(PDFName.of('OCProperties'))
  const layers = oc
    ? {
        groups: (() => {
          const arr = oc.lookup(PDFName.of('OCGs'))
          const out = []
          for (let i = 0; arr && i < arr.size(); i++) out.push(arr.lookup(i).lookup(PDFName.of('Name')).decodeText())
          return out
        })(),
        off: (() => {
          const arr = oc.lookup(PDFName.of('D'))?.lookup(PDFName.of('OFF'))
          const out = []
          for (let i = 0; arr && i < arr.size(); i++) out.push(arr.lookup(i).lookup(PDFName.of('Name')).decodeText())
          return out
        })(),
      }
    : null
  return { pageCount: pageRefs.length, pages, fields, files, layers, needAppearances: acro?.get(PDFName.of('NeedAppearances'))?.toString() }
}

if (process.argv[2]) {
  for (const file of process.argv.slice(2)) console.log(file.split('/').pop(), JSON.stringify(await inspect(fs.readFileSync(file)), null, 1))
}
