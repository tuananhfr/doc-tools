/** Ngày gõ tay kiểu Việt: "d/m/yyyy", nhận cả `-` hoặc `.` làm dấu tách. Sai lịch ("31/02/2026") → null. */
export function parseFormDate(text: string): Date | null {
  const match = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!match) return null
  const [day, month, year] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export type LeaveDateProblem = 'from' | 'to' | 'order'

/** Ô trống là hợp lệ — đơn in ra để viết tay vào chỗ "…………". */
export function leaveDateProblem(from: string, to: string): LeaveDateProblem | null {
  const start = from.trim() ? parseFormDate(from) : null
  const end = to.trim() ? parseFormDate(to) : null
  if (from.trim() && !start) return 'from'
  if (to.trim() && !end) return 'to'
  return start && end && end < start ? 'order' : null
}
