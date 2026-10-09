import { translate } from '@/i18n/runtime'

export interface InvoiceItem {
  ordinal: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
  vatRate: string
  /** Dòng chiết khấu thương mại (TChat = 3): tiền mang dấu âm. */
  discount: boolean
}

export interface InvoiceSummary {
  number: string
  series: string
  /** dd/mm/yyyy; giữ nguyên chuỗi gốc nếu không phải dạng yyyy-mm-dd. */
  date: string
  seller: { name: string; taxCode: string; address: string }
  buyer: { name: string; taxCode: string; address: string }
  items: InvoiceItem[]
  subtotal: number
  vat: number
  total: number
  hasSignatureElement: boolean
  authorityCode: string
}

const DISCOUNT_KIND = '3'

function descendants(element: Element | null, name: string): Element[] {
  return element ? [...element.getElementsByTagName('*')].filter((child) => child.localName === name) : []
}

function first(element: Element | null, name: string): Element | null {
  return descendants(element, name)[0] ?? null
}

function value(element: Element | null, name: string): string {
  return first(element, name)?.textContent?.trim() ?? ''
}

function number(element: Element | null, name: string): number {
  const raw = value(element, name)
  return raw && Number.isFinite(Number(raw)) ? Number(raw) : 0
}

export function formatInvoiceDate(raw: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw
}

function readItem(item: Element): InvoiceItem {
  const discount = value(item, 'TChat') === DISCOUNT_KIND
  // Phần mềm hoá đơn ghi tiền chiết khấu là số dương; cộng thẳng vào bảng kê là sai tổng.
  const signed = (amount: number) => discount ? -Math.abs(amount) : amount
  return {
    ordinal: value(item, 'STT'), name: value(item, 'THHDVu'), unit: value(item, 'DVTinh'),
    quantity: number(item, 'SLuong'), unitPrice: signed(number(item, 'DGia')), amount: signed(number(item, 'ThTien')),
    vatRate: value(item, 'TSuat'), discount,
  }
}

export function parseInvoiceXml(xml: string): InvoiceSummary {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(translate('vietnam:invoice.errors.doctype'))
  const document = new DOMParser().parseFromString(xml, 'text/xml')
  const root = document.documentElement
  if (!root || root.localName === 'parsererror' || descendants(root, 'parsererror').length) throw new Error(translate('vietnam:invoice.errors.invalid'))
  // Tệp gửi cơ quan thuế bọc hoá đơn trong TDiep, mà TDiep cũng có TTChung riêng (không có số, ký hiệu
  // hoá đơn): phải khoanh vùng HDon/DLHDon trước rồi mới đọc.
  const invoice = root.localName === 'HDon' ? root : first(root, 'HDon')
  const scope = invoice ?? root
  const data = scope.localName === 'DLHDon' ? scope : first(scope, 'DLHDon') ?? scope
  const common = first(data, 'TTChung')
  if (!common) throw new Error(translate('vietnam:invoice.errors.noCommon'))
  const seller = first(data, 'NBan')
  const buyer = first(data, 'NMua')
  const payment = first(data, 'TToan')
  return {
    number: value(common, 'SHDon'), series: value(common, 'KHHDon'), date: formatInvoiceDate(value(common, 'NLap')),
    seller: { name: value(seller, 'Ten'), taxCode: value(seller, 'MST'), address: value(seller, 'DChi') },
    // Người mua cá nhân thường chỉ có họ tên người mua hàng, không có tên đơn vị.
    buyer: { name: value(buyer, 'Ten') || value(buyer, 'HVTNMHang'), taxCode: value(buyer, 'MST'), address: value(buyer, 'DChi') },
    items: descendants(data, 'HHDVu').map(readItem),
    subtotal: number(payment, 'TgTCThue'), vat: number(payment, 'TgTThue'), total: number(payment, 'TgTTTBSo'),
    hasSignatureElement: descendants(root, 'Signature').length > 0,
    authorityCode: value(scope, 'MCCQT'),
  }
}

const ITEM_HEADER = ['STT', 'Tên hàng hóa, dịch vụ', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất']
const itemRow = (item: InvoiceItem): (string | number)[] => [item.ordinal, item.name, item.unit, item.quantity, item.unitPrice, item.amount, item.vatRate]

function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+@\-\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function invoiceItemsCsv(invoice: InvoiceSummary): string {
  const rows = [ITEM_HEADER, ...invoice.items.map(itemRow)]
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Bảng kê .xlsx: số lưu là số thật nên Excel cài tiếng Việt không đọc nhầm "1250.5" như với CSV. */
export async function invoiceItemsXlsx(invoice: InvoiceSummary): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('Bảng kê')
  // Ô chữ luôn ghi dạng chuỗi, không phải công thức, nên tên hàng kiểu "=HYPERLINK(...)" không chạy được.
  sheet.addRow([...ITEM_HEADER, 'Ghi chú']).font = { bold: true }
  for (const item of invoice.items) sheet.addRow([...itemRow(item), item.discount ? 'Chiết khấu' : ''])
  sheet.getColumn(2).width = 40
  sheet.getColumn(4).numFmt = '#,##0.###'
  for (const column of [5, 6]) Object.assign(sheet.getColumn(column), { numFmt: '#,##0', width: 16 })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  return new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
