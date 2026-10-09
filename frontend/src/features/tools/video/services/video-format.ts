import { numberFormat } from '@/i18n/intl'

const SECONDS: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }

/** Số giây theo ngôn ngữ trang ("12,5" ở bản tiếng Việt) — `toFixed` luôn ra dấu chấm. */
export function formatSeconds(value: number, tag?: string): string {
  return numberFormat(SECONDS, tag).format(value)
}
