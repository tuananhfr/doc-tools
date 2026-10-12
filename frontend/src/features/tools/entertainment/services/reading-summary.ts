export interface SummaryItem { label: string; role: string; text: string }
export interface ReadingSummary { items: SummaryItem[]; advice?: { label: string; text: string } }

export function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
}
