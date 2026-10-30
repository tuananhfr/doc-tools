import { describe, expect, it } from 'vitest'
import { createPihLpcProfileDocx, createPihOfficeEcosystemPptx, createPihUbotBoqXlsx } from './pih-office-samples'

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
    // Header row (row 2) + 7 line items (rows 3-9) + total row (row 10).
    expect(sheet.getCell('A2').value).toBe('Hạng mục (demo)')
    expect(sheet.getCell('B2').value).toBe('Nhóm (demo)')
    expect(sheet.getCell('A3').value).toBe('Mô-đun điều phối quy trình (demo)')
    expect(sheet.getCell('A9').value).toBe('Bảo trì năm đầu (demo)')
    // Thành tiền (column F: qty x unit price) is a real formula, not a baked-in number.
    const amountCell = sheet.getCell('F3')
    expect(String(amountCell.formula ?? '')).toContain('D3*E3')
    const totalFormula = String(sheet.getCell('F10').formula ?? '')
    expect(totalFormula).toContain('SUM(')
  })

  it('PIH ecosystem (PowerPoint) is a valid .pptx with 5 slides', async () => {
    const file = await createPihOfficeEcosystemPptx()
    expect(file.name).toBe('pih-ecosystem-demo.pptx')
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    expect(file.size).toBeGreaterThan(0)
    expect(await isZip(file)).toBe(true)

    const { unzipSync, strFromU8 } = await import('fflate')
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
    const slideFiles = Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    expect(slideFiles).toHaveLength(5)
    const diagramSlide = strFromU8(entries['ppt/slides/slide2.xml'])
    expect(diagramSlide).toContain('ERPCons Demo')
    expect(diagramSlide).toContain('Tekshot Demo')
  })
})
