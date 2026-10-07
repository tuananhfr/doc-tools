export function parseOcrMoney(input: string): { value: bigint | null; ambiguous: boolean } {
  const text = input.normalize('NFC').trim().replace(/\s*(?:đồng|VND|₫|đ)\s*$/iu, '').trim()
  if (/^[+-]?\d+$/u.test(text)) return { value: BigInt(text), ambiguous: false }
  if (/^[+-]?\d{1,3}(?:\.\d{3})+$/u.test(text)) return { value: BigInt(text.replace(/\./gu, '')), ambiguous: false }
  if (/^[+-]?\d{1,3}(?: \d{3})+$/u.test(text)) return { value: BigInt(text.replace(/ /gu, '')), ambiguous: false }
  return { value: null, ambiguous: /\d[,.]\d/u.test(text) }
}
