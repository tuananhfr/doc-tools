import { describe, expect, it } from 'vitest'
import { bodyBounds, columnPart, footerTop, sideColumns, type ColumnBlock, type ZoneItem } from './reflow-zones'

// Trang A4 nhìn từ một khối chữ 10 pt đặt ở đầu trang: `v` chạy từ 0 tới 842.
const PAGE = { v0: 0, v1: 842 }
const PITCH = 14

const text = (u0: number, base: number, width: number): ZoneItem => ({ text: true, u0, u1: u0 + width, v0: base - 7, v1: base + 2, base })
const rule = (u0: number, v0: number, width: number, height = 0.5): ZoneItem => ({ text: false, u0, u1: u0 + width, v0, v1: v0 + height })

/** Một cột chữ: `count` dòng từ `from`, dòng thứ ba mỗi đoạn là dòng cụt. */
const column = (u0: number, from: number, count: number, width = 220, pitch = PITCH) =>
  Array.from({ length: count }, (_, at) => text(u0, from + at * pitch, at % 3 === 2 ? width * 0.4 : width))

const heading = text(60, 100, 480)
const left = column(60, 140, 30)
const right = column(320, 140, 30)
const block = (line: ZoneItem): ColumnBlock => ({ left: line.u0, right: line.u1, top: line.v0, last: line.base as number, size: 10 })

describe('footerTop', () => {
  const body = column(60, 140, 20, 480)

  it('nhận cụm chữ ở đáy trang cách thân bài một khoảng rõ, kèm nét kẻ ngay trên nó', () => {
    const footer = [text(250, 800, 90), text(250, 812, 60)]
    expect(footerTop([...body, ...footer], PAGE, PITCH)).toBeCloseTo(793)
    expect(footerTop([...body, ...footer, rule(60, 786, 480)], PAGE, PITCH)).toBeCloseTo(786)
  })

  it('dòng cuối của thân bài chạy tới đáy trang không phải chân trang', () => {
    const full = column(60, 140, 48, 480)
    expect(footerTop(full, PAGE, PITCH)).toBeNull()
    expect(footerTop(body, PAGE, PITCH)).toBeNull()
  })

  it('khung viền cả trang không làm mất khoảng cách với thân bài', () => {
    const border = rule(20, 20, 0.5, 800)
    expect(footerTop([...body, border, text(250, 800, 90)], PAGE, PITCH)).toBeCloseTo(793)
  })
})

describe('bodyBounds', () => {
  it('lề dưới lấy bằng lề trên; trang đã đầy quá mức ấy thì mép dưới là chỗ nội dung đang chạm tới', () => {
    const half = column(60, 80, 20, 480)
    expect(bodyBounds(half, PAGE, null, PITCH)).toEqual({ head: 73, floor: 769 })
    const full = column(60, 80, 54, 480)
    expect(bodyBounds(full, PAGE, null, PITCH).floor).toBeCloseTo(824)
  })

  it('không lấn vào chân trang, và lề suy ra không quá 15% chiều cao trang', () => {
    const body = column(60, 300, 20, 480)
    const bounds = bodyBounds([...body, text(250, 800, 90)], PAGE, 793, PITCH)
    expect(bounds.head).toBeCloseTo(126.3)
    expect(bounds.floor).toBeCloseTo(715.7)
    // Thân bài đã chạy quá lề suy ra (769) nhưng chưa chạm chân trang: mép dưới là chân dòng cuối của nó.
    expect(bodyBounds([...column(60, 80, 51, 480), text(250, 800, 90)], PAGE, 793, PITCH).floor).toBeCloseTo(782)
  })
})

describe('sideColumns', () => {
  const page = [heading, ...left, ...right]

  it('hai cột chữ: ranh giới nằm giữa khe, vùng nhiều cột bắt đầu dưới tiêu đề trải ngang', () => {
    const columns = sideColumns(page, block(left[4]), PAGE, 842)
    expect(columns?.right).toBeCloseTo(300)
    expect(columns?.left).toBeNull()
    expect(columns?.reach).toBeCloseTo(280)
    expect(columns?.own).toBeCloseTo(548)
    expect(columns?.other).toBeCloseTo(548)
    expect(columnPart(right[10], columns!)).toBe('side')
    expect(columnPart(left[10], columns!)).toBe('own')
  })

  it('đang sửa cột phải thì cột trái đứng yên; ký hiệu mục của chính cột này không bị coi là cột khác', () => {
    const bullets = right.filter((_, at) => at % 3 === 0).map((line) => text(306, line.base as number, 5))
    const indented = right.map((line) => ({ ...line, u0: line.u0 + 4 }))
    const columns = sideColumns([heading, ...left, ...indented, ...bullets], block(indented[4]), PAGE, 842)
    expect(columns?.right).toBeNull()
    expect(columns?.left).toBeCloseTo(293)
    expect(columnPart(bullets[3], columns!)).toBe('own')
    expect(columnPart(left[10], columns!)).toBe('side')
  })

  it('đoạn trải cả trang phía dưới kết thúc vùng nhiều cột', () => {
    const closing = text(60, 600, 480)
    const columns = sideColumns([...page, closing], block(left[4]), PAGE, 842)
    expect(columns?.end).toBeCloseTo(593)
    expect(columnPart(closing, columns!)).toBe('tail')
  })

  it('bảng không phải hai cột: hàng thưa, cột hẹp, hay có nét kẻ ngang vắt qua', () => {
    const sparse = [...column(60, 140, 20, 220, 26), ...column(320, 140, 20, 220, 26)]
    expect(sideColumns(sparse, block(sparse[4]), PAGE, 842)).toBeNull()
    const narrow = [...left, ...column(320, 140, 30, 60)]
    expect(sideColumns(narrow, block(left[4]), PAGE, 842)).toBeNull()
    const ruled = [...page, ...left.map((line) => rule(50, (line.base as number) + 4, 500))]
    expect(sideColumns(ruled, block(left[4]), PAGE, 842)).toBeNull()
  })

  it('trang một cột, hay cột bên cạnh chỉ vài dòng, thì thôi', () => {
    expect(sideColumns([heading, ...left], block(left[4]), PAGE, 842)).toBeNull()
    const stub = [heading, ...left, ...column(320, 140, 5)]
    expect(sideColumns(stub, block(left[4]), PAGE, 842)).toBeNull()
  })

  describe('vùng hai cột thấp (dưới 40% trang)', () => {
    /** Các đoạn nối nhau, mỗi đoạn `lines` dòng với dòng cuối cụt; đoạn cách đoạn 22 pt thay vì 14 pt. */
    const paragraphs = (u0: number, from: number, lines: number[]) => {
      let base = from - 22
      return lines.flatMap((count) =>
        Array.from({ length: count }, (_, at) => {
          base += at === 0 ? 22 : PITCH
          return text(u0, base, at === count - 1 && count > 1 ? 90 : 220)
        }),
      )
    }
    const closing = text(60, 420, 480)

    it('hai cột chữ chảy tự do: đoạn hai bên mở đầu lệch hàng nhau thì vẫn là hai cột', () => {
      const near = paragraphs(60, 140, [4, 4, 3, 3])
      const far = paragraphs(320, 140, [1, 3, 3, 3, 3])
      const columns = sideColumns([heading, ...near, ...far, closing], block(near[5]), PAGE, 842)
      expect(columns?.right).toBeCloseTo(300)
      expect(columns?.reach).toBeCloseTo(280)
      expect(columns?.end).toBeCloseTo(413)
      // Hai cột liền một mạch, không chỗ nào sang đoạn, cũng không có gì giống bảng.
      const plain = [heading, ...column(60, 140, 12), ...column(320, 140, 12)]
      expect(sideColumns(plain, block(plain[5]), PAGE, 842)?.right).toBeCloseTo(300)
    })

    it('bảng không viền có ô nhiều dòng: ô nào cũng mở đầu ngang hàng với ô bên cạnh nên không phải hai cột', () => {
      const cells = [...paragraphs(60, 140, [3, 4, 3, 4]), ...paragraphs(320, 140, [3, 4, 3, 4])]
      expect(sideColumns([heading, ...cells, closing], block(cells[5]), PAGE, 842)).toBeNull()
      // Tiêu đề ngắn phía trên và dòng kết ngắn phía dưới không vắt qua khe nên tính vào bên trái, kéo nó cao quá 40% trang.
      const padded = [text(60, 40, 200), ...cells, text(60, 400, 150)]
      expect(sideColumns(padded, block(cells[5]), PAGE, 842)).toBeNull()
      // Ô bên phải ngắn hơn ô cùng hàng: bên phải vẫn mở đầu ngang hàng với bên trái.
      const left = paragraphs(60, 140, [4, 4, 4])
      const uneven = [text(320, 140, 220), text(320, 154, 220), text(320, 204, 220), text(320, 218, 220), text(320, 268, 220), text(320, 282, 220)]
      expect(sideColumns([heading, ...left, ...uneven, closing], block(left[5]), PAGE, 842)).toBeNull()
    })
  })
})
