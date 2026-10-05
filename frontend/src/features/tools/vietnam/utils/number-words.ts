const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const
const GROUP_UNITS = ['', 'nghìn', 'triệu'] as const

export interface NumberWordsOptions {
  zeroWord: 'linh' | 'lẻ'
  fourWord: 'bốn' | 'tư'
}

function readGroup(group: string, full: boolean, options: NumberWordsOptions): string {
  const [hundreds, tens, ones] = [...group].map(Number)
  const words: string[] = []
  if (full || hundreds > 0) words.push(`${DIGITS[hundreds]} trăm`)
  if (tens === 0 && ones > 0 && (full || hundreds > 0)) words.push(options.zeroWord)
  else if (tens === 1) words.push('mười')
  else if (tens > 1) words.push(`${DIGITS[tens]} mươi`)
  if (ones > 0) {
    if (ones === 1 && tens > 1) words.push('mốt')
    else if (ones === 4 && tens > 1) words.push(options.fourWord)
    else if (ones === 5 && tens >= 1) words.push('lăm')
    else words.push(DIGITS[ones])
  }
  return words.join(' ')
}

export function numberToVietnameseWords(input: string, options: NumberWordsOptions = { zeroWord: 'linh', fourWord: 'bốn' }): string | null {
  const trimmed = input.trim()
  if (!/^-?(?:\d+|\d{1,3}(?:[.,\s]\d{3})+)$/.test(trimmed)) return null
  const normalized = trimmed.replace(/[.,\s]/g, '')
  if (!/^-?\d{1,36}$/.test(normalized)) return null
  const negative = normalized.startsWith('-')
  const digits = normalized.replace('-', '').replace(/^0+/, '')
  if (!digits) return 'Không'
  const padded = digits.padStart(Math.ceil(digits.length / 3) * 3, '0')
  const groups = padded.match(/.{3}/g) ?? []
  const words: string[] = []
  groups.forEach((group, index) => {
    if (group === '000') return
    const position = groups.length - index - 1
    const unit = GROUP_UNITS[position % 3]
    const billions = ' tỷ'.repeat(Math.floor(position / 3))
    words.push(`${readGroup(group, words.length > 0, options)}${unit ? ` ${unit}` : ''}${billions}`.trim())
  })
  const result = `${negative ? 'âm ' : ''}${words.join(' ')}`
  return result.charAt(0).toUpperCase() + result.slice(1)
}
