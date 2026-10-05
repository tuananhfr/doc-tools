import {
  PDFAcroPushButton,
  PDFAcroSignature,
  PDFAcroTerminal,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFString,
  PDFHexString,
  PDFTextField,
  type PDFField,
  type PDFFont,
  type PDFForm,
} from 'pdf-lib'
import { newId } from '@/utils/id'
import { originOf, type PdfSource } from '../types/doc-tools.types'
import type { FormField, FormInfo, FormSummary, FormValue, FormValues } from '../types/form.types'
import { createFontLoader } from './pdf-fonts'

/**
 * Điền form AcroForm ngay trên máy. Kết quả là tệp nguồn MỚI (như trang đã
 * cắt) — tệp gốc không đổi, Ctrl+Z quay về, xem trước / xuất chạy như mọi tệp.
 *
 * Chú ý pdf-lib: `getForm()` tự XOÁ phần XFA (kèm console.warn), nên mọi chỗ
 * chỉ cần biết "có XFA không" phải hỏi catalog trước khi gọi nó.
 */

const name = (value: string) => PDFName.of(value)

/** Đếm rẻ lúc nạp tệp — không dựng PDFForm (tránh pdf-lib tự sửa tài liệu). */
export function formSummary(doc: PDFDocument): FormSummary | undefined {
  const acroForm = doc.catalog.getAcroForm()
  if (!acroForm) return undefined
  const xfa = acroForm.dict.has(name('XFA'))
  let fields = 0
  try {
    fields = acroForm
      .getAllFields()
      .filter(([field]) => field instanceof PDFAcroTerminal && !(field instanceof PDFAcroSignature) && !(field instanceof PDFAcroPushButton)).length
  } catch {
    // Cây form hỏng: coi như không có form, tệp vẫn sắp xếp / xuất bình thường.
  }
  return fields > 0 || xfa ? { fields, xfa } : undefined
}

function fieldLabel(field: PDFField): string {
  const tooltip = field.acroField.dict.lookup(name('TU'))
  if (tooltip instanceof PDFString || tooltip instanceof PDFHexString) {
    const text = tooltip.decodeText().trim()
    if (text) return text
  }
  return field.getName().split('.').at(-1) ?? field.getName()
}

function widgetPages(doc: PDFDocument, field: PDFField, pageOfAnnot: Map<string, number>): number[] {
  const pages = new Set<number>()
  for (const widget of field.acroField.getWidgets()) {
    const ref = doc.context.getObjectRef(widget.dict)
    const page = ref ? pageOfAnnot.get(ref.toString()) : undefined
    if (page !== undefined) pages.add(page)
  }
  return [...pages].sort((a, b) => a - b)
}

function readText(field: PDFTextField): string {
  try {
    return field.getText() ?? ''
  } catch {
    // Trường rich text: pdf-lib không đọc được, điền đè thì thành chữ thường.
    return ''
  }
}

function describe(doc: PDFDocument, field: PDFField, pageOfAnnot: Map<string, number>): FormField | null {
  const base = {
    name: field.getName(),
    label: fieldLabel(field),
    options: [] as string[],
    multiline: false,
    readOnly: field.isReadOnly(),
    required: field.isRequired(),
    editable: false,
    multiSelect: false,
    pages: widgetPages(doc, field, pageOfAnnot),
  }
  if (field instanceof PDFTextField) {
    return { ...base, kind: 'text', value: readText(field), multiline: field.isMultiline(), maxLength: field.getMaxLength() }
  }
  if (field instanceof PDFCheckBox) return { ...base, kind: 'checkbox', value: field.isChecked() }
  if (field instanceof PDFRadioGroup) return { ...base, kind: 'radio', value: field.getSelected() ?? '', options: field.getOptions() }
  if (field instanceof PDFDropdown) {
    return { ...base, kind: 'dropdown', value: field.getSelected(), options: field.getOptions(), editable: field.isEditable(), multiSelect: field.isMultiselect() }
  }
  if (field instanceof PDFOptionList) {
    return { ...base, kind: 'list', value: field.getSelected(), options: field.getOptions(), multiSelect: field.isMultiselect() }
  }
  return null
}

/** Mọi trường điền được của tài liệu, theo thứ tự người soạn form khai. */
export function describeForm(doc: PDFDocument): FormInfo {
  const summary = formSummary(doc)
  if (!summary) return { fields: [], xfa: false, signed: 0, skipped: 0 }

  const pageOfAnnot = new Map<string, number>()
  doc.getPages().forEach((page, index) => {
    for (const ref of page.node.Annots()?.asArray() ?? []) if (ref instanceof PDFRef) pageOfAnnot.set(ref.toString(), index)
  })

  const fields: FormField[] = []
  let signed = 0
  let skipped = 0
  for (const field of doc.getForm().getFields()) {
    const described = describe(doc, field, pageOfAnnot)
    if (described) fields.push(described)
    else if (field instanceof PDFSignature && field.acroField.dict.has(name('V'))) signed++
    else skipped++
  }
  return { fields, xfa: summary.xfa, signed, skipped }
}

function setValue(field: PDFField, value: FormValue): boolean {
  if (field instanceof PDFTextField && typeof value === 'string') field.setText(value === '' ? undefined : value)
  else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
    if (value) field.check()
    else field.uncheck()
  } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
    if (value) field.select(value)
    else field.clear()
  } else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && Array.isArray(value)) {
    if (value.length) field.select(value)
    else field.clear()
  } else return false
  return true
}

/**
 * Trỏ /DA của trường về phông vừa nhúng: Acrobat, Foxit dựng lại hình ô theo
 * /DA khi người nhận bấm vào sửa — để nguyên /Helv thì chữ có dấu vỡ ngay.
 */
function typeWith(form: PDFForm, field: PDFField, font: PDFFont) {
  if (!(field instanceof PDFTextField || field instanceof PDFDropdown || field instanceof PDFOptionList)) return
  const context = form.doc.context
  const acro = form.acroForm.dict
  let resources = acro.lookupMaybe(name('DR'), PDFDict)
  if (!resources) {
    resources = context.obj({})
    acro.set(name('DR'), resources)
  }
  let fonts = resources.lookupMaybe(name('Font'), PDFDict)
  if (!fonts) {
    fonts = context.obj({})
    resources.set(name('Font'), fonts)
  }
  fonts.set(name(font.name), font.ref)

  const retarget = (da: string | undefined) =>
    da && /\/\S+\s+[-\d.]+\s+Tf/.test(da) ? da.replace(/\/\S+(\s+[-\d.]+\s+Tf)/, `/${font.name}$1`) : `/${font.name} 0 Tf 0 g`
  field.acroField.setDefaultAppearance(retarget(field.acroField.getDefaultAppearance()))
  for (const widget of field.acroField.getWidgets()) {
    const own = widget.getDefaultAppearance()
    if (own) widget.setDefaultAppearance(retarget(own))
  }
}

/**
 * Ghi `values` vào form của `doc` rồi dựng lại hình ô bằng `font` (14 phông
 * chuẩn không có chữ có dấu). Trả về số trường đã ghi; `flatten` in phẳng
 * toàn bộ form — người nhận không sửa được nữa.
 */
export function applyFormValues(doc: PDFDocument, values: FormValues, font: PDFFont, { flatten = false } = {}): number {
  const form = doc.getForm()
  let written = 0
  for (const [fieldName, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(fieldName)
    if (!field || field.isReadOnly() || !setValue(field, value)) continue
    typeWith(form, field, font)
    written++
  }
  form.updateFieldAppearances(font)
  if (flatten) {
    form.flatten({ updateFieldAppearances: false })
    dropDeadAnnots(doc)
  }
  return written
}

/**
 * pdf-lib `flatten()` gỡ khỏi /Annots ref của HÌNH ô (AP) thay vì ref của ô,
 * rồi xoá luôn đối tượng ô — trang còn trỏ tới đối tượng không tồn tại.
 */
function dropDeadAnnots(doc: PDFDocument) {
  for (const page of doc.getPages()) {
    const annots = page.node.Annots()
    for (let index = (annots?.size() ?? 0) - 1; annots && index >= 0; index--) {
      const item = annots.get(index)
      if (item instanceof PDFRef && !doc.context.lookup(item)) annots.remove(index)
    }
  }
}

const parsed = new WeakMap<PdfSource, Promise<FormInfo>>()

/** Đọc form của tệp nguồn — nhớ theo tệp (byte nguồn không bao giờ đổi). */
export function readForm(source: PdfSource): Promise<FormInfo> {
  let info = parsed.get(source)
  if (!info) {
    info = PDFDocument.load(source.bytes, { updateMetadata: false }).then(describeForm)
    info.catch(() => parsed.delete(source))
    parsed.set(source, info)
  }
  return info
}

/** Tệp nguồn mới đã điền `values` (chỉ những trường đổi); tệp cũ giữ nguyên để hoàn tác. */
export async function fillForm(source: PdfSource, values: FormValues, { flatten = false } = {}): Promise<PdfSource> {
  const doc = await PDFDocument.load(source.bytes, { updateMetadata: false })
  // Còn ô để sửa thì nhúng đủ bộ phông: bản cắt gọn chỉ có glyph chữ đã điền.
  const font = await createFontLoader(doc, { subset: flatten })('regular')
  applyFormValues(doc, values, font, { flatten })
  const form = formSummary(doc)
  // Đã tự dựng hình mọi ô bằng phông tiếng Việt — để save() dựng lại là về Helvetica.
  const bytes = (await doc.save({ updateFieldAppearances: false })) as Uint8Array<ArrayBuffer>
  return { ...source, id: newId(), originId: originOf(source), bytes, size: bytes.byteLength, form }
}
