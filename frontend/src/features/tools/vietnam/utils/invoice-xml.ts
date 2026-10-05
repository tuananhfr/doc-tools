export interface InvoiceItem {
  ordinal: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
  vatRate: string
}

export interface InvoiceSummary {
  number: string
  series: string
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

export function parseInvoiceXml(xml: string): InvoiceSummary {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML có khai báo thực thể hoặc DOCTYPE không được hỗ trợ.')
  const document = new DOMParser().parseFromString(xml, 'text/xml')
  const root = document.documentElement
  if (!root || root.localName === 'parsererror' || descendants(root, 'parsererror').length) throw new Error('Tệp XML không hợp lệ.')
  const common = first(root, 'TTChung')
  if (!common) throw new Error('Không thấy khối thông tin chung của hóa đơn.')
  const seller = first(root, 'NBan')
  const buyer = first(root, 'NMua')
  const payment = first(root, 'TToan')
  return {
    number: value(common, 'SHDon'), series: value(common, 'KHHDon'), date: value(common, 'NLap'),
    seller: { name: value(seller, 'Ten'), taxCode: value(seller, 'MST'), address: value(seller, 'DChi') },
    buyer: { name: value(buyer, 'Ten'), taxCode: value(buyer, 'MST'), address: value(buyer, 'DChi') },
    items: descendants(root, 'HHDVu').map((item) => ({
      ordinal: value(item, 'STT'), name: value(item, 'THHDVu'), unit: value(item, 'DVTinh'),
      quantity: number(item, 'SLuong'), unitPrice: number(item, 'DGia'), amount: number(item, 'ThTien'), vatRate: value(item, 'TSuat'),
    })),
    subtotal: number(payment, 'TgTCThue'), vat: number(payment, 'TgTThue'), total: number(payment, 'TgTTTBSo'),
    hasSignatureElement: descendants(root, 'Signature').length > 0,
    authorityCode: value(root, 'MCCQT'),
  }
}

function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+@\-\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function invoiceItemsCsv(invoice: InvoiceSummary): string {
  const rows: (string | number)[][] = [['STT', 'Tên hàng hóa, dịch vụ', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất']]
  for (const item of invoice.items) rows.push([item.ordinal, item.name, item.unit, item.quantity, item.unitPrice, item.amount, item.vatRate])
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
