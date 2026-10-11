import type { CardIdentity, DeckKind } from '../entertainment.types'

const MAJOR = ['Fool', 'Magician', 'High_Priestess', 'Empress', 'Emperor', 'Hierophant', 'Lovers', 'Chariot', 'Strength', 'Hermit', 'Wheel_of_Fortune', 'Justice', 'Hanged_Man', 'Death', 'Temperance', 'Devil', 'Tower', 'Star', 'Moon', 'Sun', 'Judgement', 'World']
export const DECKS: Record<DeckKind, readonly CardIdentity[]> = {
  cards: ['H', 'D', 'C', 'S'].flatMap(suit => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({ id: suit + rank, suit, rank }))),
  tarot: [...MAJOR.map((name, index) => ({ id: `MAJOR_${String(index).padStart(2, '0')}`, name })), ...['WANDS', 'CUPS', 'SWORDS', 'PENTACLES'].flatMap(suit => ['ACE', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'PAGE', 'KNIGHT', 'QUEEN', 'KING'].map(rank => ({ id: `${suit}_${rank}`, suit, rank })))],
}
