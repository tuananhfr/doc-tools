export interface TextStats {
  /** Ký tự người đọc nhìn thấy: "ệ" gõ kiểu tổ hợp (e + ^ + .) vẫn là một. */
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  paragraphs: number
}

type Segmenter = { segment: (text: string) => Iterable<{ segment: string }> }
type SegmenterConstructor = new (locale: string, options: { granularity: 'grapheme' }) => Segmenter

/** `Intl.Segmenter` chưa có ở Firefox cũ: lùi về đếm theo code point. */
const SegmenterClass = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
const segmenter = SegmenterClass ? new SegmenterClass('vi', { granularity: 'grapheme' }) : null

function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text)
}

export function textStats(text: string): TextStats {
  if (text === '') return { characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, paragraphs: 0 }

  const parts = graphemes(text)
  const lines = text.split(/\r\n|\r|\n/)

  let paragraphs = 0
  let inParagraph = false
  for (const line of lines) {
    const filled = line.trim() !== ''
    if (filled && !inParagraph) paragraphs++
    inParagraph = filled
  }

  return {
    // "\r\n" là một cụm theo Unicode nên xuống dòng kiểu Windows vẫn đếm là một ký tự.
    characters: parts.length,
    charactersNoSpaces: parts.filter((part) => !/^\s+$/.test(part)).length,
    // Từ = cụm không có khoảng trắng VÀ có ít nhất một chữ / số: dấu gạch đầu dòng đứng riêng không phải từ.
    words: text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
    lines: lines.length,
    paragraphs,
  }
}
