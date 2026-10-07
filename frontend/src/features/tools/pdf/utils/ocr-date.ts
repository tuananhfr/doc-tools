export function validOcrDate(input: string): boolean {
  const match = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/u.exec(input.trim())
  if (!match) return false
  const [, day, month, year] = match.map(Number)
  if (year < 1000 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}
