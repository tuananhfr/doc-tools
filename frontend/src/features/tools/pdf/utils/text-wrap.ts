/** Bề rộng (pt) cho từng dòng — dòng đầu thụt vào thì hẹp hơn các dòng sau. */
export type LineWidth = number | ((line: number) => number)

/**
 * Ngắt dòng theo bề rộng (pt) như ô chữ trên màn hình: dồn từ vào dòng tới khi
 * tràn; một từ dài hơn cả dòng thì bẻ theo ký tự. Giữ nguyên xuống dòng người gõ.
 */
export function wrapText(text: string, maxWidth: LineWidth, measure: (line: string) => number): string[] {
  const lines: string[] = []
  const limit = () => (typeof maxWidth === 'number' ? maxWidth : maxWidth(lines.length))
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= limit()) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      // Từ dài hơn cả dòng (mã số, đường dẫn): bẻ theo ký tự, phần dư thành đầu dòng mới.
      let rest = word
      while (measure(rest) > limit() && rest.length > 1) {
        let cut = rest.length - 1
        while (cut > 1 && measure(rest.slice(0, cut)) > limit()) cut--
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }
  return lines
}
