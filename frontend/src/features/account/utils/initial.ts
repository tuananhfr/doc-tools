/** First visible letter, upper-cased; whole grapheme so "Đ" or an emoji is not cut in half. */
export function initialOf(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)
  return first.segment.toLocaleUpperCase()
}
