export const INTERPRETATION_VERSION = 'cn-ent-interpretation-vi-v1'
export const INTERPRETATION_LANGUAGE = 'vi'

export const INTERPRETATION_SOURCES = {
  tarot: [
    { title: 'A. E. Waite: The Pictorial Key to the Tarot', url: 'https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot/Part_3' },
    { title: 'Labyrinthos: Ý nghĩa 78 lá và trải bài', url: 'https://labyrinthos.co/blogs/tarot-card-meanings-list' },
    { title: 'Biddy Tarot: Ý nghĩa xuôi và ngược', url: 'https://biddytarot.com/tarot-card-meanings/' },
  ],
  cards: [
    { title: 'Grimoire: Cartomancy với bộ bài 52 lá', url: 'https://www.grimoire.love/guides/cartomancy-playing-cards-tutorial/' },
    { title: 'Telling Fortunes by Cards (1914): Các cách đọc truyền thống', url: 'https://www.gutenberg.org/cache/epub/42008/pg42008-images.html' },
  ],
  numerology: [
    { title: 'Numerology.com: Vai trò các chỉ số cốt lõi', url: 'https://www.numerology.com/articles/your-numerology-chart/core-numbers-numerology/' },
    { title: 'Numerology.com: Ý nghĩa số Đường đời', url: 'https://www.numerology.com/articles/your-numerology-chart/life-path-number-meanings/' },
    { title: 'Hans Decoz: Chỉ số Nội tâm', url: 'https://www.worldnumerology.com/numerology-soul-urge/' },
    { title: 'Hans Decoz: Chu kỳ Năm cá nhân', url: 'https://www.worldnumerology.com/personal-numerology-forecast/' },
  ],
} as const

export type InterpretationKind = keyof typeof INTERPRETATION_SOURCES
