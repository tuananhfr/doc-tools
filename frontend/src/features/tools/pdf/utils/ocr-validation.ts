import type { OcrField, OcrTable, OcrValidation } from '../types/ocr-layout.types'
import { parseOcrMoney } from './ocr-money'
import { validOcrDate } from './ocr-date'

export function validateOcrFields(fields: OcrField[]): OcrValidation[] {
  const findings: OcrValidation[] = []
  for (const field of fields) {
    const value = field.verified?.value ?? field.rawText
    const add = (code: OcrValidation['code'], severity: OcrValidation['severity'] = 'error') => findings.push({ id: `${field.id}:${code}`, targetId: field.id, code, severity })
    if (field.required && !value.trim()) add('required')
    if (value && field.kind === 'date' && !validOcrDate(value)) add('invalid-date')
    if (value && field.kind === 'money') {
      const parsed = parseOcrMoney(value)
      if (parsed.value === null) add(parsed.ambiguous ? 'ambiguous-money' : 'invalid-money')
    }
    if ((field.required || field.kind !== 'text') && !field.verified) add('unverified')
  }
  const identifiers = fields.filter(field => field.kind === 'identifier' && (field.verified?.value ?? field.rawText))
  for (const field of identifiers) if (identifiers.some(other => other.id !== field.id && (other.verified?.value ?? other.rawText) === (field.verified?.value ?? field.rawText))) {
    findings.push({ id: `${field.id}:duplicate`, targetId: field.id, code: 'duplicate', severity: 'warning' })
  }
  return findings
}

export function validateOcrTable(table: OcrTable): OcrValidation[] {
  const findings: OcrValidation[] = []
  if (!table.verifiedAt) findings.push({ id: `${table.id}:unverified`, targetId: table.id, code: 'unverified', severity: 'error' })
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gu, 'd').toLowerCase().trim()
  const valueOf = (cell: OcrTable['cells'][number]) => cell.verified?.value ?? cell.rawText
  const headers = table.cells.filter(cell => cell.row < 2)
  for (const cell of table.cells) {
    const above = headers.find(header => header.column === cell.column && header.row < cell.row && /^(thanh tien|so tien|amount|don gia|ngay|date|ma|id)$/u.test(normalize(valueOf(header))))
    const before = table.cells.find(other => other.row === cell.row && other.column + other.columnSpan === cell.column && /^(ngay|date)$/u.test(normalize(valueOf(other))))
    const label = normalize(before ? valueOf(before) : above ? valueOf(above) : '')
    const kind = /^(ngay|date)$/u.test(label) ? 'date' : /^(ma|id)$/u.test(label) ? 'identifier' : label ? 'money' : null
    if (!kind || !valueOf(cell).trim() && !before) continue
    findings.push(...validateOcrFields([{ id: cell.id, label, kind, required: Boolean(before), wordIds: cell.wordIds, rawText: cell.rawText, verified: cell.verified }]))
  }
  const totalCell = table.cells.find(cell => /^(tổng|total)$/iu.test(cell.verified?.value ?? cell.rawText))
  if (totalCell) {
    const moneyColumn = table.columns - 1
    const total = table.cells.find(cell => cell.row === totalCell.row && cell.column === moneyColumn)
    const parts = table.cells.filter(cell => cell.row > 1 && cell.row < totalCell.row && cell.column === moneyColumn)
    const expected = total ? parseOcrMoney(total.verified?.value ?? total.rawText).value : null
    const values = parts.map(cell => parseOcrMoney(cell.verified?.value ?? cell.rawText).value)
    if (expected !== null && values.length && values.every(value => value !== null) && values.reduce<bigint>((sum, value) => sum + value!, 0n) !== expected) {
      findings.push({ id: `${table.id}:sum`, targetId: total!.id, code: 'sum-mismatch', severity: 'warning' })
    }
  }
  return findings
}
