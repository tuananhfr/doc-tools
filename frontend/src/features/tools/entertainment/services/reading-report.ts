import { INTERPRETATION_SOURCES, INTERPRETATION_VERSION, type InterpretationKind } from '../config/interpretation-sources'
import { SPREAD_METHOD_NOTE } from '../config/draw-spreads'
import { NUMEROLOGY_METHOD_NOTE } from '../config/numerology-method'
import { CONCLUSION_METHOD_NOTE, CONCLUSION_VERSION } from '../config/conclusion-method'
import type { CardIdentity } from '../types/entertainment.types'
import type { drawReading } from './card-reading'
import type { numerologyReading } from './numerology-reading'
import type { ReadingSummary } from './reading-summary'

function summaryLines(summary: ReadingSummary | null): string[] {
  if (!summary) return []
  const { conclusion } = summary
  return [
    'Kết luận chung', ...conclusion.paragraphs,
    ...(conclusion.advice ? [`Lời khuyên: ${conclusion.advice}`] : []),
    ...(conclusion.period ? [conclusion.period.title, conclusion.period.text, `Nên làm trong năm này: ${conclusion.period.advice}`] : []),
    ...(summary.items.length ? ['Vì sao có nhận xét này?', ...summary.items.map(item => `${item.role ? `${item.role} · ` : ''}${item.label}: ${item.text}`)] : []),
  ]
}

export function readingSourceLines(kind: InterpretationKind): string[] {
  return [
    `Bộ luận giải tiếng Việt: ${INTERPRETATION_VERSION}`,
    'Chuyện Nhỏ biên soạn nội dung từ ý nghĩa truyền thống, kèm ví dụ và lời khuyên. Các tác giả nguồn không xác nhận kết quả riêng này.',
    kind === 'numerology' ? NUMEROLOGY_METHOD_NOTE : SPREAD_METHOD_NOTE,
    `Phiên bản kết luận: ${CONCLUSION_VERSION}`,
    CONCLUSION_METHOD_NOTE,
    ...INTERPRETATION_SOURCES[kind].map(source => `${source.title}: ${source.url}`),
  ]
}

export function drawReadingLines(reading: ReturnType<typeof drawReading>, kind: 'cards' | 'tarot', labelOf: (card: CardIdentity) => string): string[] {
  return [
    ...(reading.spread ? [reading.spread.title] : []),
    ...summaryLines(reading.summary),
    ...reading.cards.flatMap(({ card, position, meaning }) => [
      `${card.position}. ${labelOf(card)}${kind === 'tarot' ? ` (${card.orientation === 'REVERSED' ? 'Ngược' : 'Xuôi'})` : ''}${position ? ` · ${position.title}` : ''}`,
      ...(position ? [position.description] : []),
      ...(meaning ? [meaning.keywords.join(' · '), meaning.text, `Lời khuyên: ${meaning.advice}`] : ['Chưa có nội dung phù hợp cho lá này.']),
    ]),
    ...readingSourceLines(kind),
  ]
}

export function numerologyReadingLines(reading: ReturnType<typeof numerologyReading>, nameOf: (id: string) => string): string[] {
  return [
    ...summaryLines(reading.summary),
    ...reading.metrics.flatMap(({ metric, meaning, role }) => [
      `${nameOf(metric.id)}: ${metric.value ?? 'Không tính được'}${metric.steps.length ? ` (${metric.steps.join(' → ')})` : ''}`,
      ...(role ? [role.description] : []),
      ...(meaning ? [meaning.keywords.join(' · '), meaning.text, `${metric.id === 'personal_year' ? 'Nên tập trung' : 'Điểm mạnh'}: ${meaning.strength}`, `${metric.id === 'personal_year' ? 'Cần tránh' : 'Điểm dễ vướng'}: ${meaning.growth}`, `Lời khuyên: ${meaning.advice}`] : [metric.value === null ? 'Không có chữ phù hợp để tính chỉ số này; không gán luận giải.' : 'Chưa có nội dung cho giá trị này.']),
    ]),
    ...readingSourceLines('numerology'),
  ]
}

// Readings are made for Vietnamese users, so the stamp stays in Vietnam time even when the device clock is set elsewhere.
const REPORT_TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

export function reportTimeLine(label: string, at: Date): string {
  return `${label}: ${REPORT_TIME.format(at)}`
}
