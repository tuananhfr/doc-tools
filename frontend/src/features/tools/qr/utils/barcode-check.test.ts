import { describe, expect, it } from 'vitest'
import { csvFirstColumn, readBatch } from './barcode-batch'
import { checkBarcode, gs1CheckDigit, gs1PrefixNote, gs1Valid } from './barcode-check'

describe('gs1CheckDigit', () => {
  it('khớp các mã thật đã biết', () => {
    // 4006381333931 — mã ví dụ kinh điển của GS1; 96385074 — EAN-8; 10012345678902 — ITF-14 mẫu của GS1.
    expect(gs1CheckDigit('400638133393')).toBe(1)
    expect(gs1CheckDigit('9638507')).toBe(4)
    expect(gs1CheckDigit('1001234567890')).toBe(2)
    expect(gs1Valid('4006381333931')).toBe(true)
    expect(gs1Valid('4006381333932')).toBe(false)
  })
})

describe('checkBarcode', () => {
  it('EAN-13: 12 số thì tự thêm số kiểm tra và nói ra', () => {
    const result = checkBarcode('ean13', '400638133393')
    expect(result).toEqual({ ok: true, value: '4006381333931', notes: ['Đã thêm số kiểm tra 1.'] })
  })

  it('EAN-13: bỏ khoảng trắng / gạch nối chép từ bao bì', () => {
    expect(checkBarcode('ean13', '4 006381 333931')).toMatchObject({ ok: true, value: '4006381333931' })
  })

  it('EAN-13: số kiểm tra sai thì BÁO, không tự sửa', () => {
    const result = checkBarcode('ean13', '4006381333932')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('phải là 1')
  })

  it('sai độ dài / có chữ', () => {
    expect(checkBarcode('ean8', '12345').ok).toBe(false)
    expect(checkBarcode('itf14', '10012345678902').ok).toBe(true)
    expect(checkBarcode('ean13', '40063813339A').ok).toBe(false)
  })

  it('Code 39 đổi sang chữ hoa và nói ra; ký tự lạ thì chặn', () => {
    expect(checkBarcode('code39', 'ts-0042')).toEqual({ ok: true, value: 'TS-0042', notes: ['Code 39 không có chữ thường — đã đổi sang chữ hoa.'] })
    expect(checkBarcode('code39', 'A_B').ok).toBe(false)
  })

  it('Code 128 chặn chữ có dấu (bwip-js không báo lỗi mà mã hoá sai)', () => {
    expect(checkBarcode('code128', 'Đá 1x2').ok).toBe(false)
    expect(checkBarcode('code128', 'VT-000123 a/b')).toMatchObject({ ok: true, value: 'VT-000123 a/b' })
    expect(checkBarcode('code128', '   ').ok).toBe(false)
    expect(checkBarcode('code128', 'x'.repeat(81)).ok).toBe(false)
  })
})

describe('gs1PrefixNote', () => {
  it('nói đúng điều tiền tố cho biết', () => {
    expect(gs1PrefixNote('8934567890128')).toContain('GS1 Việt Nam')
    expect(gs1PrefixNote('9786040000000')).toContain('ISBN')
    expect(gs1PrefixNote('2012345678901')).toContain('nội bộ')
    expect(gs1PrefixNote('4006381333931')).toBeNull()
    expect(gs1PrefixNote('96385074')).toBeNull()
  })
})

describe('lô CSV', () => {
  it('lấy cột đầu, hiểu ngoặc kép và dấu chấm phẩy', () => {
    expect(csvFirstColumn(String.fromCharCode(0xfeff) + 'Mã;Tên\r\n"VT,01";Cát\nVT02,Đá\n"A""B"')).toEqual(['Mã', 'VT,01', 'VT02', 'A"B'])
  })

  it('dòng đầu là tiêu đề thì bỏ qua, dòng trống bỏ, dòng sai giữ lại kèm lý do', () => {
    const batch = readBatch('ean13', ['Mã sản phẩm', '400638133393', '', '4006381333932'])
    expect(batch.header).toBe('Mã sản phẩm')
    expect(batch.rows.map((row) => [row.line, row.check.ok])).toEqual([
      [2, true],
      [4, false],
    ])
  })

  it('cắt ở trần 500 dòng và đếm số dòng bị cắt', () => {
    const batch = readBatch('code128', Array.from({ length: 503 }, (_, index) => `VT${index}`))
    expect(batch.rows).toHaveLength(500)
    expect(batch.dropped).toBe(3)
  })
})
