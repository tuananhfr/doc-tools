import { normalizeTextSearch } from '@/utils/text-search'
import { SEARCH_TYPOS } from '../config/intent-registry'

const STOPWORDS = new Set('toi minh ban muon can lam cach nao co the giup cho voi mot hai ba cac nhung tep file qua nay duoc khong de thi va tu cua chi roi la se nhu nhe cai may nhieu bang gui zalo email hom nay'.split(' '))

export const searchWords = (text: string): string[] => [...new Set(normalizeTextSearch(text)
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:mb|gb|kb)\b/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
  .flatMap(token => (SEARCH_TYPOS[token] ?? token).split(' ')))]

export const meaningfulWords = (text: string) => searchWords(text).filter(word => !STOPWORDS.has(word) && !/^\d+$/.test(word))

export function closeWord(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const different = [...a].map((char, i) => char === b[i] ? -1 : i).filter(i => i >= 0)
    return different.length === 1 || (different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]])
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  let skipped = false, index = 0
  for (const char of long) {
    if (char === short[index]) index++
    else if (skipped) return false
    else skipped = true
  }
  return index === short.length
}

const UNSUPPORTED = [
  /(?:be khoa|hack|pha mat khau)/,
  /(?:chu ky gia|gia mao|gia chu ky)/,
  /(?:chu tay|viet tay|ghi chu viet tay)/,
  /(?:nen).*(?:zip|mp3|nhac)/,
  /(?:ghep|gom).*(?:zip)/,
  /(?:chinh sua).*(?:photoshop|video chuyen nghiep)/,
  /(?:chuyen tien|tu chuyen khoan|chuyen khoan ngan hang ngay)/,
  /(?:dat ve|chan doan|tri dau dau|mua thuoc|du bao gia co phieu|ho chieu online|quy hoach chinh thuc)/,
]

export const unsupportedQuery = (text: string) => UNSUPPORTED.some(pattern => pattern.test(normalizeTextSearch(text)))
