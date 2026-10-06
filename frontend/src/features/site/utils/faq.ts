import { normalizeTextSearch } from '@/utils/text-search'
import type { FaqItem } from '../config/support-faq'

/** Lọc như ô tìm công cụ: bỏ dấu, mỗi từ chỉ cần có trong câu hỏi hoặc câu trả lời. */
export function searchFaq(items: readonly FaqItem[], keyword: string): FaqItem[] {
  const tokens = normalizeTextSearch(keyword).split(' ').filter(Boolean)
  if (tokens.length === 0) return [...items]
  return items.filter((item) => {
    const haystack = normalizeTextSearch(`${item.question} ${item.answer}`)
    return tokens.every((token) => haystack.includes(token))
  })
}

export function pickFaq(items: readonly FaqItem[], ids: readonly string[]): FaqItem[] {
  return ids.flatMap((id) => items.find((item) => item.id === id) ?? [])
}

/** JSON-LD FAQPage; `<` được thoát vì chuỗi nằm trong thẻ `<script>`. */
export function faqJsonLd(items: readonly FaqItem[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
  }).replace(/</g, '\\u003c')
}
