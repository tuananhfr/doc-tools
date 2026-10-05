import { expect, it } from 'vitest'
import { readFlashcards, reviewFlashcard } from './flashcards'

it('schedules remembered cards and recovers corrupted local storage', () => {
  const card = { id: '1', front: 'A', back: 'B', box: 0, dueAt: 0 }
  expect(reviewFlashcard(card, true, 1000).dueAt).toBe(1000 + 86400000)
  expect(reviewFlashcard({ ...card, box: 3 }, false, 1000).box).toBe(0)
  expect(readFlashcards('{broken')).toEqual([])
})
