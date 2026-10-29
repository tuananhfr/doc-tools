import { describe, expect, it } from 'vitest'
import { createPihLpcProfileDocx, createPihUbotBoqXlsx } from './pih-office-samples'

async function isZip(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  return bytes[0] === 0x50 && bytes[1] === 0x4b // 'PK' — .docx/.xlsx are zip containers
}

describe('pih-office-samples', () => {
  it('LPC profile (Word) is a non-empty, valid .docx container', async () => {
    const file = await createPihLpcProfileDocx()
    expect(file.name).toBe('lpc-profile-demo.docx')
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(file.size).toBeGreaterThan(0)
    expect(await isZip(file)).toBe(true)
  })

  it('Ubot BOQ (Excel) is a valid .xlsx with the expected sheet, rows and formulas', async () => {
    const { default: ExcelJS } = await import('exceljs')
    const file = await createPihUbotBoqXlsx()
    expect(file.name).toBe('boq-ubot-demo.xlsx')
    expect(await isZip(file)).toBe(true)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const sheet = workbook.worksheets[0]
    expect(sheet).toBeDefined()
    expect(sheet.name).toBe('BOQ Ubot (demo)')
    // Header row (row 2) + 4 line items (rows 3-6) + total row (row 7).
    expect(sheet.getCell('A2').value).toBe('Hạng mục (demo)')
    expect(sheet.getCell('A3').value).toBe('Mô-đun điều phối quy trình (demo)')
    // Thành tiền is a real formula (qty * unit price), not a baked-in number.
    const amountCell = sheet.getCell('E3')
    expect(String(amountCell.formula ?? '')).toContain('C3*D3')
    const totalFormula = String(sheet.getCell('E7').formula ?? '')
    expect(totalFormula).toContain('SUM(')
  })
})
