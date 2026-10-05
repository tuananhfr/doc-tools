import type { PageText } from '../types/text-layer.types'
import { gapBetween, sameLine } from './text-search'

const SPACE = /\s/

/**
 * Lớp chữ của một trang → văn bản thường, GIỮ xuống dòng. Chỉ mục tìm kiếm
 * (`buildPageIndex`) nối mọi dòng bằng dấu cách vì nó cần một chuỗi liền;
 * người chép chữ ra thì cần đúng dòng như trên trang.
 */
export function plainText(page: PageText): string {
  let out = ''
  page.runs.forEach((run, index) => {
    const previous = page.runs[index - 1]
    if (previous && out.length > 0) {
      if (previous.eol || !sameLine(previous, run)) out += '\n'
      // Cùng quy tắc với chỉ mục tìm: hai mảnh sát nhau là cùng một từ, không chèn dấu cách.
      else if (!SPACE.test(out[out.length - 1]) && !SPACE.test(run.text[0] ?? ' ') && gapBetween(previous, run) > Math.max(previous.size, run.size) * 0.15) out += ' '
    }
    out += run.text
  })
  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

/** Nhiều trang thành một văn bản, mỗi trang cách nhau một dòng trống; trang không có chữ bị bỏ. */
export function joinPageTexts(pages: string[]): string {
  return pages.filter((text) => text.length > 0).join('\n\n')
}
