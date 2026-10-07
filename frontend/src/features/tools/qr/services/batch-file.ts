import { ToolError, TOOL_ERROR } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import { csvFirstColumn } from '../utils/barcode-batch'

const isXlsx = (file: File) => /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const isCsv = (file: File) => /\.(csv|txt)$/i.test(file.name) || file.type === 'text/csv' || file.type === 'text/plain'

/** Chữ hiển thị của một ô Excel — số dài như mã vạch phải giữ nguyên chữ số, không ra dạng 8.93E+12. */
function cellText(value: unknown, shown: string | undefined): string {
  if (typeof value === 'number') return Number.isInteger(value) ? value.toFixed(0) : String(value)
  if (value && typeof value === 'object' && 'richText' in value) return (value as { richText: { text: string }[] }).richText.map((part) => part.text).join('')
  if (value && typeof value === 'object' && 'result' in value) return String((value as { result: unknown }).result ?? '')
  return shown ?? (value == null ? '' : String(value))
}

/** Cột ĐẦU của tệp CSV / XLSX (trang tính đầu tiên), mỗi dòng một chuỗi — dòng trống giữ chỗ để số dòng khớp tệp. */
export async function readFirstColumn(file: File): Promise<string[]> {
  if (isCsv(file)) return csvFirstColumn(await file.text())
  if (!isXlsx(file)) throw new ToolError(TOOL_ERROR.unsupportedFormat, translate('qr:batch.unsupported'))

  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(await file.arrayBuffer())
  const sheet = book.worksheets[0]
  if (!sheet) return []
  const values: string[] = []
  sheet.eachRow({ includeEmpty: true }, (row, number) => {
    const cell = row.getCell(1)
    values[number - 1] = cellText(cell.value, cell.text)
  })
  return Array.from(values, (value) => value ?? '')
}
