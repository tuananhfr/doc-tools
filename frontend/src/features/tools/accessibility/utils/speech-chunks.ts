/**
 * Chia văn bản thành đoạn ngắn để đọc nối tiếp. Một lượt đọc dài là hỏng câm: Chrome Android từ chối
 * lượt quá ~4.000 ký tự (`text-too-long`), giọng online của Chrome desktop tự dừng sau ~15 giây,
 * còn Piper sinh âm thanh cả đoạn một lần nên đoạn dài làm câu đầu chậm phát.
 */
export const SPEECH_CHUNK_CHARS = 220

/** Một đoạn đọc, giữ vị trí trong văn bản GỐC để bôi đúng chữ người dùng đã gõ (chuẩn hoá làm đổi độ dài). */
export interface SpeechChunk {
  text: string
  start: number
  end: number
}

type Range = [start: number, end: number]

const BOUNDARY = /(?<=[.!?…;:])\s+/gu
// "TP. Hà Nội", "Q. 1", "ThS. Lan": dấu chấm của chức danh/địa danh không phải hết câu.
const TITLE_BEFORE_NAME = /(?:^|[\s(])(?:TP|Tp|Q|P|TS|ThS|PGS|GS|BS)\.$/u

function isSentenceBreak(text: string, punctuationEnd: number, next: number): boolean {
  const following = text[next] ?? ''
  // Chữ thường ngay sau dấu chấm ("v.v. và", "ông A. cho biết") là viết tắt giữa câu.
  if (text[punctuationEnd - 1] === '.' && /\p{Ll}/u.test(following)) return false
  return !(TITLE_BEFORE_NAME.test(text.slice(Math.max(0, punctuationEnd - 6), punctuationEnd)) && /[\p{Lu}\d]/u.test(following))
}

function trim(text: string, start: number, end: number): Range {
  while (start < end && /\s/u.test(text[start])) start++
  while (end > start && /\s/u.test(text[end - 1])) end--
  return [start, end]
}

function sentences(text: string): Range[] {
  const ranges: Range[] = []
  for (const paragraph of text.matchAll(/[^\n]+/g)) {
    const base = paragraph.index
    let cursor = base
    for (const gap of paragraph[0].matchAll(BOUNDARY)) {
      const at = base + gap.index
      if (!isSentenceBreak(text, at, at + gap[0].length)) continue
      ranges.push(trim(text, cursor, at))
      cursor = at + gap[0].length
    }
    ranges.push(trim(text, cursor, base + paragraph[0].length))
  }
  return ranges.filter(([start, end]) => end > start)
}

/** Gộp các mệnh đề liền nhau miễn còn dưới trần, để không đọc từng mệnh đề ngắn rời rạc. */
function pack(pieces: Range[], max: number): Range[] {
  const packed: Range[] = []
  for (const piece of pieces) {
    const last = packed.at(-1)
    if (last && piece[1] - last[0] <= max) last[1] = piece[1]
    else packed.push([...piece])
  }
  return packed
}

function splitLong(text: string, [start, end]: Range, max: number): Range[] {
  if (end - start <= max) return [[start, end]]
  const clauses: Range[] = []
  let cursor = start
  for (const gap of text.slice(start, end).matchAll(/(?<=,)\s+/gu)) {
    clauses.push(trim(text, cursor, start + gap.index))
    cursor = start + gap.index + gap[0].length
  }
  if (clauses.length) return pack([...clauses, trim(text, cursor, end)], max).flatMap((clause) => splitLong(text, clause, max))
  const parts: Range[] = []
  let rest: Range = [start, end]
  while (rest[1] - rest[0] > max) {
    const space = text.lastIndexOf(' ', rest[0] + max)
    const cut = space > rest[0] + max / 2 ? space : rest[0] + max
    parts.push(trim(text, rest[0], cut))
    rest = trim(text, cut, rest[1])
  }
  return rest[1] > rest[0] ? [...parts, rest] : parts
}

/** Mỗi câu một đoạn (câu dài cắt theo dấu phẩy rồi khoảng trắng), để bôi được đúng câu đang đọc. */
export function splitSpeechText(text: string, max = SPEECH_CHUNK_CHARS): SpeechChunk[] {
  return sentences(text)
    .flatMap((range) => splitLong(text, range, max))
    .map(([start, end]) => ({ text: text.slice(start, end), start, end }))
    .filter((chunk) => /[\p{L}\p{N}]/u.test(chunk.text))
}

/** Các đoạn còn lại khi đọc tiếp từ `offset`; đoạn chứa `offset` chỉ đọc phần sau nó (`from`). */
export function speechChunksFrom(chunks: SpeechChunk[], offset: number): { chunk: SpeechChunk; from: number }[] {
  return chunks
    .filter((chunk) => chunk.end > offset)
    .map((chunk) => ({ chunk, from: Math.max(chunk.start, offset) }))
    .filter(({ chunk, from }) => /[\p{L}\p{N}]/u.test(chunk.text.slice(from - chunk.start)))
}
