export interface Flashcard {
  id: string
  front: string
  back: string
  box: number
  dueAt: number
}

const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]

export function reviewFlashcard(card: Flashcard, remembered: boolean, now: number): Flashcard {
  const box = remembered ? Math.min(5, card.box + 1) : 0
  return { ...card, box, dueAt: now + INTERVAL_DAYS[box] * 24 * 60 * 60 * 1000 }
}

export function readFlashcards(raw: string | null): Flashcard[] {
  if (!raw) return []
  try {
    const items: unknown = JSON.parse(raw)
    if (!Array.isArray(items)) return []
    return items.filter((item): item is Flashcard => typeof item === 'object' && item !== null &&
      typeof item.id === 'string' && typeof item.front === 'string' && typeof item.back === 'string' &&
      Number.isInteger(item.box) && item.box >= 0 && item.box <= 5 && Number.isFinite(item.dueAt)).slice(0, 1000)
  } catch { return [] }
}
