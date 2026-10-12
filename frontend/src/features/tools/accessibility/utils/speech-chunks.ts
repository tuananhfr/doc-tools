/**
 * Chia văn bản thành đoạn ngắn để đọc nối tiếp. Một lượt đọc dài là hỏng câm: Chrome Android từ chối
 * lượt quá ~4.000 ký tự (`text-too-long`), giọng online của Chrome desktop tự dừng sau ~15 giây,
 * còn Piper sinh âm thanh cả đoạn một lần nên đoạn dài làm câu đầu chậm phát.
 */
export const SPEECH_CHUNK_CHARS = 220

const SENTENCE_END = /(?<=[.!?…;:])\s+/u

function splitLong(piece: string, max: number): string[] {
  if (piece.length <= max) return [piece]
  const clauses = piece.split(/(?<=,)\s+/u)
  if (clauses.length > 1) return pack(clauses, max).flatMap((clause) => splitLong(clause, max))
  const parts: string[] = []
  let rest = piece
  while (rest.length > max) {
    const space = rest.lastIndexOf(' ', max)
    const cut = space > max / 2 ? space : max
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  return rest ? [...parts, rest] : parts
}

/** Gộp các mảnh liền nhau miễn còn dưới trần, để không đọc từng mệnh đề ngắn rời rạc. */
function pack(pieces: string[], max: number): string[] {
  const packed: string[] = []
  for (const piece of pieces) {
    const last = packed.at(-1)
    if (last !== undefined && last.length + 1 + piece.length <= max) packed[packed.length - 1] = `${last} ${piece}`
    else packed.push(piece)
  }
  return packed
}

export function splitSpeechText(text: string, max = SPEECH_CHUNK_CHARS): string[] {
  return text.split(/\n+/)
    .flatMap((paragraph) => pack(paragraph.trim().split(SENTENCE_END).filter(Boolean), max))
    .flatMap((piece) => splitLong(piece, max))
    .filter((piece) => /[\p{L}\p{N}]/u.test(piece))
}
