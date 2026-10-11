import { parseMoney } from '@/features/tools/hub/utils/number-input'
import { numberToVietnameseWords } from '@/features/tools/vietnam/utils/number-words'
import { parseFormDate } from './form-dates'

export function receiptAmount(text: string) {
  const amount = parseMoney(text)
  return amount !== null && Number.isSafeInteger(amount) && amount > 0 && amount <= 999_999_999_999_999 ? amount : null
}

export function receiptWords(text: string) {
  const amount = receiptAmount(text)
  return amount === null ? null : numberToVietnameseWords(String(amount))
}

export function receiptProblem(values: Record<string, string>): 'required' | 'amount' | 'date' | null {
  if (['sender', 'receiver', 'amount', 'date'].some(key => !values[key]?.trim())) return 'required'
  if (receiptAmount(values.amount) === null) return 'amount'
  return parseFormDate(values.date) ? null : 'date'
}
