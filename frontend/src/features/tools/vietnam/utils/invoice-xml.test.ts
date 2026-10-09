import ExcelJS from 'exceljs'
import { SaxesParser } from 'saxes'
import { beforeAll, describe, expect, it } from 'vitest'
import { formatInvoiceDate, invoiceItemsCsv, invoiceItemsXlsx, parseInvoiceXml } from './invoice-xml'

// Vitest chạy môi trường node, không có DOMParser: dựng cây tối thiểu (localName, getElementsByTagName('*'),
// textContent) bằng saxes — thư viện exceljs đã kéo theo.
class FakeElement {
  readonly children: FakeElement[] = []
  readonly parts: (string | FakeElement)[] = []
  constructor(readonly localName: string) {}
  getElementsByTagName(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.getElementsByTagName()])
  }
  get textContent(): string {
    return this.parts.map((part) => typeof part === 'string' ? part : part.textContent).join('')
  }
}

class FakeDomParser {
  parseFromString(xml: string) {
    const stack: FakeElement[] = []
    let root: FakeElement | null = null
    const parser = new SaxesParser()
    parser.on('opentag', (tag) => {
      const element = new FakeElement(tag.name.split(':').pop() ?? tag.name)
      const parent = stack.at(-1)
      if (parent) { parent.children.push(element); parent.parts.push(element) } else root = element
      stack.push(element)
    })
    parser.on('text', (text) => { stack.at(-1)?.parts.push(text) })
    parser.on('closetag', () => { stack.pop() })
    try {
      parser.write(xml).close()
    } catch {
      return { documentElement: new FakeElement('parsererror') }
    }
    return { documentElement: root }
  }
}

beforeAll(() => {
  Object.assign(globalThis, { DOMParser: FakeDomParser })
})

const invoiceBody = (buyer: string) => `<HDon><DLHDon Id="data">
  <TTChung><PBan>2.1.0</PBan><KHHDon>C26TAA</KHHDon><SHDon>00001234</SHDon><NLap>2026-10-05</NLap></TTChung>
  <NDHDon>
    <NBan><Ten>CÔNG TY TNHH ÁNH DƯƠNG</Ten><MST>0312345678</MST><DChi>12 Nguyễn Huệ</DChi></NBan>
    <NMua>${buyer}<DChi>5 Tràng Tiền</DChi></NMua>
    <DSHHDVu>
      <HHDVu><TChat>1</TChat><STT>1</STT><THHDVu>Thép cuộn D8</THHDVu><DVTinh>Kg</DVTinh><SLuong>1250.5</SLuong><DGia>17600</DGia><ThTien>22008800</ThTien><TSuat>8%</TSuat></HHDVu>
      <HHDVu><TChat>3</TChat><STT>2</STT><THHDVu>Chiết khấu thương mại</THHDVu><ThTien>408800</ThTien><TSuat>8%</TSuat></HHDVu>
      <HHDVu><TChat>1</TChat><STT>3</STT><THHDVu>=HYPERLINK("http://evil")</THHDVu><SLuong>1</SLuong><DGia>1000</DGia><ThTien>1000</ThTien></HHDVu>
    </DSHHDVu>
    <TToan><TgTCThue>21601000</TgTCThue><TgTThue>1728080</TgTThue><TgTTTBSo>23329080</TgTTTBSo></TToan>
  </NDHDon>
</DLHDon><MCCQT>00ABCDEF</MCCQT><DSCKS><NBan><Signature><SignedInfo/></Signature></NBan></DSCKS></HDon>`

const plain = invoiceBody('<Ten>Công ty Cổ phần Kiến Trúc</Ten><MST>0109876543</MST><HVTNMHang>Trần Thị Bình</HVTNMHang>')
// Tệp gửi cơ quan thuế: TDiep có TTChung riêng, đứng TRƯỚC TTChung của hoá đơn.
const wrapped = `<?xml version="1.0" encoding="UTF-8"?><TDiep><TTChung><PBan>2.1.0</PBan><MNGui>K0101234567</MNGui><MLTDiep>200</MLTDiep><SLuong>1</SLuong></TTChung><DLieu>${plain}</DLieu></TDiep>`

describe('parseInvoiceXml', () => {
  it('reads the invoice block, not the TDiep envelope header', () => {
    const invoice = parseInvoiceXml(wrapped)
    expect(invoice.number).toBe('00001234')
    expect(invoice.series).toBe('C26TAA')
    expect(invoice.date).toBe('05/10/2026')
    expect(invoice.authorityCode).toBe('00ABCDEF')
    expect(invoice.hasSignatureElement).toBe(true)
    expect(invoice.items).toHaveLength(3)
    expect(invoice.total).toBe(23329080)
    expect(parseInvoiceXml(plain)).toEqual(invoice)
  })

  it('shows discount lines as negative amounts', () => {
    const [goods, discount] = parseInvoiceXml(plain).items
    expect(goods).toMatchObject({ amount: 22008800, quantity: 1250.5, discount: false })
    expect(discount).toMatchObject({ name: 'Chiết khấu thương mại', amount: -408800, discount: true })
  })

  it('keeps the company name and falls back to the buyer person when Ten is missing', () => {
    expect(parseInvoiceXml(plain).buyer.name).toBe('Công ty Cổ phần Kiến Trúc')
    const person = parseInvoiceXml(invoiceBody('<HVTNMHang>Trần Thị Bình</HVTNMHang>'))
    expect(person.buyer).toEqual({ name: 'Trần Thị Bình', taxCode: '', address: '5 Tràng Tiền' })
  })

  it('rejects DOCTYPE, broken XML and files without an invoice header', () => {
    expect(() => parseInvoiceXml('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e "boom">]><HDon/>')).toThrow()
    expect(() => parseInvoiceXml('<HDon><DLHDon><TTChung>')).toThrow()
    expect(() => parseInvoiceXml('<root><a>1</a></root>')).toThrow()
  })
})

describe('formatInvoiceDate', () => {
  it('turns ISO dates into dd/mm/yyyy and leaves anything else alone', () => {
    expect(formatInvoiceDate('2026-10-05')).toBe('05/10/2026')
    expect(formatInvoiceDate('2026-10-05T08:30:00')).toBe('05/10/2026')
    expect(formatInvoiceDate('05/10/2026')).toBe('05/10/2026')
    expect(formatInvoiceDate('')).toBe('')
  })
})

describe('exports', () => {
  it('keeps the CSV layout and neutralises formula-looking names', () => {
    const lines = invoiceItemsCsv(parseInvoiceXml(plain)).replace('﻿', '').split('\r\n')
    expect(lines[0]).toBe('"STT","Tên hàng hóa, dịch vụ","Đơn vị","Số lượng","Đơn giá","Thành tiền","Thuế suất"')
    expect(lines[2]).toBe('"2","Chiết khấu thương mại","","0","0","-408800","8%"')
    expect(lines[3].startsWith('"3","\'=HYPERLINK')).toBe(true)
  })

  it('writes real numbers to the xlsx sheet, flags discounts and stores names as text', async () => {
    const blob = await invoiceItemsXlsx(parseInvoiceXml(wrapped))
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(await blob.arrayBuffer())
    const sheet = book.worksheets[0]
    expect(sheet.name).toBe('Bảng kê')
    expect(sheet.getRow(1).values).toEqual([undefined, 'STT', 'Tên hàng hóa, dịch vụ', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất', 'Ghi chú'])
    expect(sheet.getRow(2).getCell(4).value).toBe(1250.5)
    expect(sheet.getRow(2).getCell(6).value).toBe(22008800)
    expect(sheet.getRow(3).getCell(6).value).toBe(-408800)
    expect(sheet.getRow(3).getCell(8).value).toBe('Chiết khấu')
    expect(sheet.getRow(4).getCell(2).value).toBe('=HYPERLINK("http://evil")')
    expect(sheet.getRow(4).getCell(2).type).toBe(ExcelJS.ValueType.String)
  })
})
