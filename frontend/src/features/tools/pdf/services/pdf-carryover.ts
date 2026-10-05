import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObjectCopier,
  PDFRef,
  PDFString,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib'
import { NO_CARRYOVER, type CarryoverReport } from '../utils/carryover-summary'

/**
 * Giữ phần "cấp tài liệu" khi chép trang sang tệp mới: form, liên kết nội bộ,
 * tệp đính kèm, layer. `copyPages` chỉ chép trang — thiếu bước này thì form
 * thành hình vẽ chết, layer đang TẮT hiện ra trong bản xuất (lộ ghi chú nội
 * bộ), liên kết trỏ vào bản sao mồ côi của trang đích (tệp phình to vô cớ).
 *
 * Hai bước: `prepareSource` sửa bản nạp TẠM của tệp nguồn trước khi chép (đánh
 * dấu đích liên kết bằng số trang, tỉa cây form, gắn nhãn layer), `finishCarryover`
 * dựng lại trên tệp ra sau khi đã thêm đủ trang. Tệp nguồn gốc không bị đụng.
 */

const KEY = {
  destIndex: PDFName.of('ErpDestIndex'),
  layer: PDFName.of('ErpLayer'),
}

const name = (value: string) => PDFName.of(value)

/** Hành động tự chạy — spec 07: không mang nội dung chủ động sang tệp xuất. */
const ACTIVE_ACTIONS = new Set(['/JavaScript', '/Launch', '/ImportData', '/SubmitForm', '/ResetForm'])

export interface PreparedSource {
  key: string
  doc: PDFDocument
  acroForm?: PDFDict
  layers?: { dict: PDFDict; count: number }
  attachments: [string, PDFObject][]
  signatures: number
  xfa: boolean
  removedScripts: number
}

export interface PlacedPage {
  page: PDFPage
  sourceKey: string
  pageIndex: number
}

function text(object: PDFObject | undefined): string | undefined {
  if (object instanceof PDFString || object instanceof PDFHexString) return object.decodeText()
  if (object instanceof PDFName) return object.decodeText()
  return undefined
}

function lookupDict(doc: PDFDocument, object: PDFObject | undefined): PDFDict | undefined {
  const value = object instanceof PDFRef ? doc.context.lookup(object) : object
  return value instanceof PDFDict ? value : undefined
}

function lookupArray(doc: PDFDocument, object: PDFObject | undefined): PDFArray | undefined {
  const value = object instanceof PDFRef ? doc.context.lookup(object) : object
  return value instanceof PDFArray ? value : undefined
}

/** Các cặp [tên, giá trị] của một cây tên (Names tree), đi cả nhánh Kids. */
function nameTreeEntries(doc: PDFDocument, root: PDFDict | undefined): [string, PDFObject][] {
  const entries: [string, PDFObject][] = []
  const visit = (node: PDFDict | undefined, depth: number) => {
    if (!node || depth > 32) return
    const names = lookupArray(doc, node.get(name('Names')))
    for (let index = 0; names && index + 1 < names.size(); index += 2) {
      const key = text(doc.context.lookup(names.get(index)))
      if (key !== undefined) entries.push([key, names.get(index + 1)])
    }
    const kids = lookupArray(doc, node.get(name('Kids')))
    for (let index = 0; kids && index < kids.size(); index++) visit(lookupDict(doc, kids.get(index)), depth + 1)
  }
  visit(root, 0)
  return entries
}

/** Đích có tên (`/Dest (chuong-2)`) → mảng đích tường minh, tra trong /Dests hoặc cây Names/Dests. */
function namedDest(doc: PDFDocument, key: string): PDFArray | undefined {
  const unwrap = (value: PDFObject | undefined) => {
    const array = lookupArray(doc, value)
    if (array) return array
    return lookupArray(doc, lookupDict(doc, value)?.get(name('D')))
  }
  const legacy = lookupDict(doc, doc.catalog.get(name('Dests')))
  const direct = legacy && unwrap(legacy.get(name(key)))
  if (direct) return direct
  const tree = lookupDict(doc, lookupDict(doc, doc.catalog.get(name('Names')))?.get(name('Dests')))
  const hit = nameTreeEntries(doc, tree).find(([entry]) => entry === key)
  return hit ? unwrap(hit[1]) : undefined
}

/**
 * Đích liên kết → số trang trong tệp nguồn + phần còn lại của mảng đích
 * (/XYZ trái trên zoom…). Không xác định được → -1 (sẽ bỏ ở tệp ra).
 */
function destToIndex(doc: PDFDocument, dest: PDFObject, pageIndexByRef: Map<string, number>): PDFArray {
  const named = text(doc.context.lookup(dest))
  const array = named !== undefined ? namedDest(doc, named) : lookupArray(doc, dest)
  const first = array?.get(0)
  const index = first instanceof PDFRef ? (pageIndexByRef.get(first.toString()) ?? -1) : first instanceof PDFNumber ? first.asNumber() : -1
  const rest = array ? array.asArray().slice(1).filter((item) => !(item instanceof PDFRef)) : [name('Fit')]
  return doc.context.obj([index, ...rest])
}

/** Gỡ hành động tự chạy khỏi một annotation; trả về số hành động đã gỡ. */
function stripActive(doc: PDFDocument, annot: PDFDict): number {
  let removed = 0
  if (annot.has(name('AA'))) {
    annot.delete(name('AA'))
    removed++
  }
  const action = lookupDict(doc, annot.get(name('A')))
  const kind = action?.get(name('S'))?.toString()
  if (kind && ACTIVE_ACTIONS.has(kind)) {
    annot.delete(name('A'))
    removed++
  } else if (action?.has(name('Next'))) {
    // Chuỗi hành động nối tiếp có thể giấu JavaScript phía sau một liên kết vô hại.
    action.delete(name('Next'))
    removed++
  }
  return removed
}

/** Tỉa cây form: chỉ giữ ô (widget) nằm trên trang được xuất; trả về `true` nếu nhánh còn ô nào. */
function pruneField(doc: PDFDocument, ref: PDFObject, keep: Set<string>, depth = 0): boolean {
  const field = lookupDict(doc, ref)
  if (!field || depth > 32) return false
  const kids = lookupArray(doc, field.get(name('Kids')))
  if (!kids) return ref instanceof PDFRef && keep.has(ref.toString())
  const kept = kids.asArray().filter((kid) => {
    const kidDict = lookupDict(doc, kid)
    if (!kidDict) return false
    // Con có /T là trường con (đệ quy); không có /T là ô thuần của trường này.
    if (kidDict.has(name('T'))) return pruneField(doc, kid, keep, depth + 1)
    return kid instanceof PDFRef && keep.has(kid.toString())
  })
  field.set(name('Kids'), doc.context.obj(kept))
  return kept.length > 0
}

function pruneFields(doc: PDFDocument, acroForm: PDFDict, keep: Set<string>) {
  const fields = lookupArray(doc, acroForm.get(name('Fields')))
  const roots = fields ? fields.asArray().filter((field) => pruneField(doc, field, keep)) : []
  acroForm.set(name('Fields'), doc.context.obj(roots))
}

/**
 * Tỉa cây form về những ô còn nằm trên trang của chính tài liệu. Dùng khi một trang bị xẻ thành nhiều tệp (sửa chữ
 * tràn trang): các tệp ấy dựng từ cùng một tệp gốc nên tệp nào cũng mang đủ cây form — không tỉa thì mỗi trường có
 * mặt ở mọi tệp, bảng điền form hiện lặp và khi xuất bị đổi tên thành `_2`.
 */
export function pruneFormToPages(doc: PDFDocument) {
  const acroForm = lookupDict(doc, doc.catalog.get(name('AcroForm')))
  if (!acroForm) return
  const keep = new Set<string>()
  for (const page of doc.getPages()) {
    const annots = page.node.Annots()
    for (let position = 0; annots && position < annots.size(); position++) {
      const raw = annots.get(position)
      if (raw instanceof PDFRef && lookupDict(doc, raw)?.get(name('Subtype'))?.toString() === '/Widget') keep.add(raw.toString())
    }
  }
  pruneFields(doc, acroForm, keep)
}

function inherited(doc: PDFDocument, field: PDFDict, key: string): PDFObject | undefined {
  let node: PDFDict | undefined = field
  for (let depth = 0; node && depth < 32; depth++) {
    const value = node.get(name(key))
    if (value) return value
    node = lookupDict(doc, node.get(name('Parent')))
  }
  return undefined
}

const RADIO_FLAG = 1 << 15

/**
 * Khoá của nhóm radio mà ô này thuộc về (ref của trường cha); `undefined` với mọi ô khác. Nhóm radio là trường DUY
 * NHẤT không xẻ ra hai tệp được: lựa chọn đang đánh dấu ghi bằng thứ tự nút trong nhóm, tỉa bớt nút là nó chỉ sang
 * nút khác.
 */
export function radioGroupKey(doc: PDFDocument, widget: PDFDict): string | undefined {
  const parent = widget.get(name('Parent'))
  if (!(parent instanceof PDFRef) || widget.has(name('T'))) return undefined
  const flags = inherited(doc, widget, 'Ff')
  const radio = inherited(doc, widget, 'FT') === name('Btn') && flags instanceof PDFNumber && (flags.asNumber() & RADIO_FLAG) !== 0
  return radio ? parent.toString() : undefined
}

/**
 * Sửa bản nạp tạm của tệp nguồn trước `copyPages`. `keepPages` = các trang
 * (chỉ số) sẽ được chép — form và đích liên kết chỉ tính trên những trang đó.
 */
export function prepareSource(doc: PDFDocument, key: string, keepPages: Iterable<number>): PreparedSource {
  const pages = doc.getPages()
  const pageIndexByRef = new Map(pages.map((page, index) => [page.ref.toString(), index]))
  const kept = [...new Set(keepPages)].filter((index) => index >= 0 && index < pages.length)
  const widgetRefs = new Map<string, PDFRef>()
  let removedScripts = 0

  for (const index of kept) {
    // Bead (/B) trỏ sang trang khác của mạch bài viết — cùng bẫy với /P bên dưới, mà /Threads không được chép.
    pages[index].node.delete(name('B'))
    const annots = pages[index].node.Annots()
    for (let position = 0; annots && position < annots.size(); position++) {
      const raw = annots.get(position)
      const annot = lookupDict(doc, raw)
      if (!annot) continue
      if (annot.get(name('Subtype'))?.toString() === '/Widget' && raw instanceof PDFRef) widgetRefs.set(raw.toString(), raw)
      removedScripts += stripActive(doc, annot)
      // copyPages nhận diện trang theo object chứ không theo ref: /P trỏ về chính trang đó sẽ
      // kéo thêm một BẢN SAO mồ côi của trang vào tệp ra. Gỡ ở đây, gắn lại trong `relink`.
      annot.delete(name('P'))

      const dest = annot.get(name('Dest'))
      if (dest) {
        annot.set(KEY.destIndex, destToIndex(doc, dest, pageIndexByRef))
        annot.delete(name('Dest'))
      }
      const action = lookupDict(doc, annot.get(name('A')))
      if (action?.get(name('S'))?.toString() === '/GoTo' && action.get(name('D'))) {
        action.set(KEY.destIndex, destToIndex(doc, action.get(name('D'))!, pageIndexByRef))
        action.delete(name('D'))
      }
    }
  }

  let signatures = 0
  let xfa = false
  const acroForm = lookupDict(doc, doc.catalog.get(name('AcroForm')))
  if (acroForm) {
    xfa = acroForm.has(name('XFA'))
    pruneFields(doc, acroForm, new Set(widgetRefs.keys()))
    for (const ref of widgetRefs.values()) {
      const widget = lookupDict(doc, ref)
      if (widget && inherited(doc, widget, 'FT')?.toString() === '/Sig' && inherited(doc, widget, 'V')) signatures++
    }
  }

  let layers: PreparedSource['layers']
  const properties = lookupDict(doc, doc.catalog.get(name('OCProperties')))
  const groups = properties && lookupArray(doc, properties.get(name('OCGs')))
  if (properties && groups) {
    groups.asArray().forEach((group, index) => lookupDict(doc, group)?.set(KEY.layer, PDFString.of(`${key}:${index}`)))
    layers = { dict: properties, count: groups.size() }
  }

  const names = lookupDict(doc, doc.catalog.get(name('Names')))
  const attachments = nameTreeEntries(doc, lookupDict(doc, names?.get(name('EmbeddedFiles'))))

  return { key, doc, acroForm, layers, attachments, signatures, xfa, removedScripts }
}

/** Gắn lại /P và đích liên kết trên các trang của tệp ra; liên kết tới trang không xuất bị bỏ. */
function relink(output: PDFDocument, placed: PlacedPage[]): number {
  const first = new Map<string, PDFRef>()
  for (const item of placed) {
    const key = `${item.sourceKey}:${item.pageIndex}`
    if (!first.has(key)) first.set(key, item.page.ref)
  }
  const resolve = (holder: PDFDict, sourceKey: string): PDFArray | null => {
    const tagged = lookupArray(output, holder.get(KEY.destIndex))
    holder.delete(KEY.destIndex)
    const index = tagged?.get(0)
    const target = index instanceof PDFNumber ? first.get(`${sourceKey}:${index.asNumber()}`) : undefined
    return target && tagged ? output.context.obj([target, ...tagged.asArray().slice(1)]) : null
  }

  let dropped = 0
  for (const item of placed) {
    const annots = item.page.node.Annots()
    if (!annots) continue
    for (let position = annots.size() - 1; position >= 0; position--) {
      const annot = lookupDict(output, annots.get(position))
      if (!annot) continue
      annot.set(name('P'), item.page.ref)
      const isLink = annot.get(name('Subtype'))?.toString() === '/Link'
      let dead = false
      if (annot.has(KEY.destIndex)) {
        const dest = resolve(annot, item.sourceKey)
        if (dest) annot.set(name('Dest'), dest)
        else dead = true
      }
      const action = lookupDict(output, annot.get(name('A')))
      if (action?.has(KEY.destIndex)) {
        const dest = resolve(action, item.sourceKey)
        if (dest) action.set(name('D'), dest)
        else if (isLink) dead = true
        else annot.delete(name('A'))
      }
      if (dead && isLink) {
        annots.remove(position)
        dropped++
      }
    }
  }
  return dropped
}

/** Trường gốc (không có /Parent) của mọi ô form trên tệp ra; trường trùng tên (trang nhân bản) được đổi tên. */
function rebuildForm(output: PDFDocument, placed: PlacedPage[], prepared: PreparedSource[], copier: (source: PreparedSource) => PDFObjectCopier) {
  const roots: PDFRef[] = []
  const seen = new Set<string>()
  const usedNames = new Set<string>()
  let renamed = 0
  for (const item of placed) {
    const annots = item.page.node.Annots()
    for (let position = 0; annots && position < annots.size(); position++) {
      let ref = annots.get(position)
      let node = lookupDict(output, ref)
      if (!node || node.get(name('Subtype'))?.toString() !== '/Widget') continue
      for (let depth = 0; depth < 32; depth++) {
        const parent = node.get(name('Parent'))
        const parentDict = lookupDict(output, parent)
        if (!parent || !parentDict) break
        ref = parent
        node = parentDict
      }
      if (!(ref instanceof PDFRef) || seen.has(ref.toString())) continue
      seen.add(ref.toString())
      const fieldName = text(node.get(name('T')))
      if (fieldName !== undefined) {
        let unique = fieldName
        for (let suffix = 2; usedNames.has(unique); suffix++) unique = `${fieldName}_${suffix}`
        if (unique !== fieldName) {
          node.set(name('T'), PDFHexString.fromText(unique))
          renamed++
        }
        usedNames.add(unique)
      }
      roots.push(ref)
    }
  }
  if (roots.length === 0) return { fields: 0, renamed: 0 }

  const form = output.context.obj({ Fields: roots })
  const resources = output.context.obj({}) as PDFDict
  for (const source of prepared) {
    const acro = source.acroForm
    if (!acro) continue
    if (!form.has(name('DA')) && acro.get(name('DA'))) form.set(name('DA'), copier(source).copy(acro.get(name('DA'))!))
    if (acro.get(name('NeedAppearances')) === PDFBool.True) form.set(name('NeedAppearances'), PDFBool.True)
    const sigFlags = acro.get(name('SigFlags'))
    if (sigFlags instanceof PDFNumber) form.set(name('SigFlags'), sigFlags)
    // Gộp tài nguyên mặc định (phông của ô nhập): khoá đã có thì giữ bản của tệp trước.
    const dr = lookupDict(source.doc, acro.get(name('DR')))
    if (!dr) continue
    const copied = copier(source).copy(dr)
    for (const [category, value] of copied.entries()) {
      const target = lookupDict(output, resources.get(category))
      const incoming = lookupDict(output, value)
      if (!target || !incoming) {
        if (!resources.has(category)) resources.set(category, value)
        continue
      }
      for (const [entry, item] of incoming.entries()) if (!target.has(entry)) target.set(entry, item)
    }
  }
  if (resources.keys().length) form.set(name('DR'), resources)
  output.catalog.set(name('AcroForm'), output.context.register(form))
  return { fields: roots.length, renamed }
}

/** Gộp OCProperties: chỉ những layer thực sự còn được dùng ở trang đã chép, giữ nguyên bật/tắt mặc định. */
function rebuildLayers(output: PDFDocument, prepared: PreparedSource[]): number {
  const byTag = new Map<string, PDFRef>()
  for (const [ref, object] of output.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue
    const tag = text(object.get(KEY.layer))
    if (tag === undefined) continue
    byTag.set(tag, ref)
    object.delete(KEY.layer)
  }
  if (byTag.size === 0) return 0

  const groups: PDFRef[] = []
  const off: PDFRef[] = []
  const order: PDFObject[] = []
  const locked: PDFRef[] = []
  for (const source of prepared) {
    if (!source.layers) continue
    const doc = source.doc
    const dict = source.layers.dict
    const sourceGroups = lookupArray(doc, dict.get(name('OCGs')))?.asArray() ?? []
    const mapOf = new Map<string, PDFRef>()
    sourceGroups.forEach((group, index) => {
      const mapped = byTag.get(`${source.key}:${index}`)
      if (mapped && group instanceof PDFRef) mapOf.set(group.toString(), mapped)
    })
    const mapRef = (object: PDFObject) => (object instanceof PDFRef ? mapOf.get(object.toString()) : undefined)
    groups.push(...sourceGroups.map(mapRef).filter((ref): ref is PDFRef => !!ref))

    const config = lookupDict(doc, dict.get(name('D')))
    const listOf = (key: string) => (lookupArray(doc, config?.get(name(key)))?.asArray() ?? []).map(mapRef).filter((ref): ref is PDFRef => !!ref)
    const onList = new Set(listOf('ON').map(String))
    const offList = new Set(listOf('OFF').map(String))
    const baseOff = config?.get(name('BaseState'))?.toString() === '/OFF'
    for (const ref of sourceGroups.map(mapRef)) {
      if (!ref) continue
      const hidden = offList.has(String(ref)) || (baseOff && !onList.has(String(ref)))
      if (hidden) off.push(ref)
    }
    locked.push(...listOf('Locked'))

    const remapOrder = (object: PDFObject, depth: number): PDFObject | undefined => {
      if (depth > 16) return undefined
      const array = lookupArray(doc, object)
      if (array) {
        const items = array.asArray().map((item) => remapOrder(item, depth + 1)).filter((item): item is PDFObject => !!item)
        const meaningful = items.some((item) => !(item instanceof PDFString || item instanceof PDFHexString))
        return meaningful ? output.context.obj(items) : undefined
      }
      if (object instanceof PDFString || object instanceof PDFHexString) return object
      return mapRef(object)
    }
    const sourceOrder = config?.get(name('Order'))
    const mappedOrder = sourceOrder ? remapOrder(sourceOrder, 0) : undefined
    if (mappedOrder instanceof PDFArray) order.push(...mappedOrder.asArray())
  }

  const config = output.context.obj({ BaseState: 'ON', OFF: off, Order: order.length ? order : groups })
  if (locked.length) config.set(name('Locked'), output.context.obj(locked))
  output.catalog.set(name('OCProperties'), output.context.obj({ OCGs: groups, D: config }))
  return groups.length
}

function rebuildAttachments(output: PDFDocument, prepared: PreparedSource[], copier: (source: PreparedSource) => PDFObjectCopier): number {
  const entries: [string, PDFObject][] = []
  const used = new Set<string>()
  for (const source of prepared) {
    for (const [fileName, spec] of source.attachments) {
      let unique = fileName
      for (let suffix = 2; used.has(unique); suffix++) unique = `${suffix} - ${fileName}`
      used.add(unique)
      entries.push([unique, copier(source).copy(spec)])
    }
  }
  if (entries.length === 0) return 0
  // Cây tên phải xếp theo thứ tự khoá — trình đọc tra nhị phân, lệch thứ tự là "không thấy tệp".
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const flat = entries.flatMap(([key, value]) => [PDFHexString.fromText(key), value])
  const names = lookupDict(output, output.catalog.get(name('Names'))) ?? output.context.obj({})
  names.set(name('EmbeddedFiles'), output.context.obj({ Names: flat }))
  output.catalog.set(name('Names'), names)
  return entries.length
}

/** Dựng lại form / liên kết / layer / tệp đính kèm trên tệp ra; gọi SAU khi đã thêm đủ trang. */
export function finishCarryover(output: PDFDocument, prepared: PreparedSource[], placed: PlacedPage[]): CarryoverReport {
  const used = new Set(placed.map((item) => item.sourceKey))
  const sources = prepared.filter((source) => used.has(source.key))
  const copiers = new Map<string, PDFObjectCopier>()
  const copier = (source: PreparedSource) => {
    let found = copiers.get(source.key)
    if (!found) {
      found = PDFObjectCopier.for(source.doc.context, output.context)
      copiers.set(source.key, found)
    }
    return found
  }

  const droppedLinks = relink(output, placed)
  const form = rebuildForm(output, placed, sources, copier)
  const layers = rebuildLayers(output, sources)
  const attachments = rebuildAttachments(output, sources, copier)
  return {
    ...NO_CARRYOVER,
    fields: form.fields,
    renamedFields: form.renamed,
    attachments,
    layers,
    droppedLinks,
    removedScripts: sources.reduce((sum, source) => sum + source.removedScripts, 0),
    signatures: sources.reduce((sum, source) => sum + source.signatures, 0),
    xfaForms: sources.filter((source) => source.xfa).length,
  }
}
