import { describe, expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import type { PageObject } from './reflow-layout'
import { paragraphAround } from './text-paragraph'
import type { RunMeasure } from './text-search'

// Chữ 10 pt, mỗi ký tự rộng 5 pt, dòng cách dòng 14 pt, cột chữ từ x = 100 tới x = 400.
function run(text: string, x: number, y: number, size = 10): TextRun {
  return { text, origin: { x, y }, angle: 0, size, width: text.length * (size / 2), ascent: 0.8, descent: 0.2, fontName: 'f', fontFamily: 'sans-serif', eol: false }
}

const FULL = 'tư vấn giám sát lập biên bản không phù hợp và yêu cầu nhà thầu'
const range = (runs: TextRun[], index: number, objects?: PageObject[], measure?: RunMeasure) => {
  const [from, to] = paragraphAround(runs, index, measure, objects)
  return [from.run, to.run]
}

describe('paragraphAround', () => {
  // Đoạn 1: thụt đầu dòng, ba dòng. Cách một khoảng đoạn rồi tới đoạn 2 một dòng.
  const page: TextRun[] = [
    run('Tiêu đề cỡ lớn chạy gần hết bề ngang cột', 100, 150, 16),
    run(FULL.slice(4), 120, 200),
    run(FULL, 100, 214),
    run('dòng cuối ngắn.', 100, 228),
    run('Đoạn thứ hai chỉ có một dòng.', 120, 250),
  ]

  it('bấm dòng nào của đoạn cũng lấy trọn đoạn, không lấn sang tiêu đề hay đoạn kế', () => {
    expect(range(page, 1)).toEqual([1, 3])
    expect(range(page, 2)).toEqual([1, 3])
    expect(range(page, 3)).toEqual([1, 3])
    expect(range(page, 4)).toEqual([4, 4])
    expect(range(page, 0)).toEqual([0, 0])
  })

  it('dòng trên chưa đầy thì dòng dưới là đoạn khác dù cách đều', () => {
    const list = [run('Nhà thầu tự kiểm tra.', 100, 200), run(FULL, 100, 214), run('ký bổ sung.', 100, 228), run('Ảnh chụp kèm toạ độ.', 100, 242)]
    expect(range(list, 0)).toEqual([0, 0])
    expect(range(list, 1)).toEqual([1, 2])
    expect(range(list, 3)).toEqual([3, 3])
  })

  it('ký hiệu đầu dòng mở đoạn mới; dòng thụt treo của mục đi theo mục', () => {
    const items = [
      run('', 82, 200),
      run(FULL, 100, 200),
      run('nối tiếp mục một.', 100, 214),
      run('', 82, 228),
      run(FULL, 100, 228),
      run('2. ' + FULL.slice(3), 100, 242),
      run('nối tiếp mục đánh số.', 115, 256),
    ]
    expect(range(items, 2)).toEqual([1, 2])
    expect(range(items, 4)).toEqual([4, 4])
    expect(range(items, 6)).toEqual([5, 6])
  })

  it('không nối hai hàng của bảng: nét kẻ ngang ngăn giữa, hoặc ô bên cạnh chặn mép phải', () => {
    const rows = [run(FULL, 100, 200), run(FULL, 100, 214)]
    const border: PageObject = { kind: 'path', box: { x: 90, y: 205, width: 320, height: 0.4 } }
    expect(range(rows, 0)).toEqual([0, 1])
    expect(range(rows, 0, [border])).toEqual([0, 0])

    // Ô hai dòng, bên phải có ô khác: "đầy" tính tới mép ô chứ không tới mép cột của trang.
    const cells = [run('Dầm ngang nhịp bốn', 100, 200), run('đoạn giữa hai trụ.', 100, 214), run('Tổ cốt thép', 210, 200), run(FULL, 100, 300)]
    expect(range(cells, 0)).toEqual([0, 1])
    expect(range(cells, 2)).toEqual([2, 2])
  })

  it('khoảng cách dòng lệch khỏi nhịp của đoạn là hết đoạn', () => {
    const spaced = [run(FULL, 100, 200), run(FULL, 100, 214), run(FULL, 100, 232), run('hết.', 100, 246)]
    expect(range(spaced, 0)).toEqual([0, 1])
    expect(range(spaced, 3)).toEqual([2, 3])
  })

  describe('mép cột lấy từ các dòng liền kề', () => {
    // Cột trái rộng 200 pt (x = 100…300), cột phải từ x = 330 lệch chân chữ 7 pt; dưới cùng là đoạn trải cả trang.
    const LEFT = 'nhà thầu chịu trách nhiệm kiểm tra hồ sơ'
    const WIDE = 'hai bên cam kết thực hiện đúng các điều khoản nêu trên và chịu trách nhiệm trước pháp luật'
    const columns = [
      run(LEFT, 100, 200),
      run(LEFT, 100, 214),
      run('trước khi nghiệm thu.', 100, 228),
      run(LEFT, 100, 250),
      run(LEFT, 100, 264),
      run('lưu giữ đủ chứng chỉ.', 100, 278),
      ...[207, 221, 235, 257, 271, 285].map((y) => run(LEFT, 330, y)),
      run(WIDE, 100, 300),
      run('về nội dung đã ký.', 100, 314),
    ]

    it('trang hai cột có đoạn trải cả trang ở dưới: dòng của cột vẫn là dòng đầy', () => {
      expect(LEFT.length * 5).toBe(200)
      expect(range(columns, 0)).toEqual([0, 2])
      expect(range(columns, 4)).toEqual([3, 5])
      expect(range(columns, 12)).toEqual([12, 13])
    })

    it('danh sách nhãn — giá trị có chữ bên phải từng dòng nhưng không phải cột chữ: mỗi dòng vẫn đứng riêng', () => {
      const labels = ['Chủ đầu tư:', 'Nhà thầu chính:', 'Tư vấn giám sát:', 'Đơn vị thiết kế:', 'Tư vấn thẩm tra:', 'Đơn vị kiểm định:']
      // Cả cột nhãn được ghi trước rồi mới tới cột giá trị: không có khúc chữ lạ nào chen giữa hai nhãn để chặn việc nối.
      const page = [run(FULL, 100, 100), ...labels.map((label, at) => run(label, 100, 200 + at * 14)), ...labels.map((_, at) => run('Công ty cổ phần xây lắp', 230, 200 + at * 14))]
      expect(range(page, 2)).toEqual([2, 2])
      expect(range(page, 3)).toEqual([3, 3])
      // Hàng "Bên A … Bên B" nằm ngay dưới một dòng đứng riêng cũng vậy.
      const row = [run(FULL, 100, 100), run('Một dòng ngắn đứng riêng.', 100, 200), run('Bên A', 100, 214), run('Bên B', 300, 214)]
      expect(range(row, 1)).toEqual([1, 1])
    })
  })

  it('từ đầu dòng dưới đo bằng hàm đo thật, không chia đều theo số ký tự', () => {
    // "mmm" rộng gấp đôi chữ thường: chia đều thì tưởng nó còn chen được vào khoảng trống cuối dòng trên.
    const wide: RunMeasure = (item, chars) => [...item.text.slice(0, chars)].reduce((sum, char) => sum + (char === 'm' ? 10 : 5), 0)
    const upper = FULL.slice(0, 57)
    const lower = 'mmm là từ rộng.'
    const lines = [run(FULL, 100, 186), run(upper, 100, 200), { ...run(lower, 100, 214), width: wide(run(lower, 100, 214), lower.length) }]
    expect(range(lines, 1)).toEqual([0, 1])
    expect(range(lines, 1, undefined, wide)).toEqual([0, 2])
  })
})
