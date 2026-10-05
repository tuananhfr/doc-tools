import { describe, expect, it } from 'vitest'
import { blockShift, isBelowBlock, placeOf, placeRiders, planReflow, planShift, reflowLines, reflowLineStart, riderFrames, type PageObject } from './reflow-layout'
import type { LineSpan } from './text-select'

// Chữ 10 pt, dòng cách dòng 14 pt, cột chữ từ x = 100 tới x = 400.
function span(x: number, y: number, length: number, text = 'chữ', angle = 0): LineSpan {
  return { start: { x, y }, angle, length, top: -8, bottom: 2, text, size: 10, run: 0 }
}

function text(x: number, baseline: number, width: number): PageObject {
  return { kind: 'text', box: { x, y: baseline - 7, width, height: 9 }, anchor: { x, y: baseline } }
}

const A4 = { width: 595, height: 842 }
const planned = (spans: LineSpan[], neighbours: LineSpan[], page: PageObject[]) => planReflow(spans, neighbours, page, A4)
const body = [span(100, 186, 300), span(100, 200, 180), span(100, 214, 300), span(100, 228, 120)]
const objects: PageObject[] = [text(100, 186, 300), text(100, 200, 90), text(190, 200, 90), text(100, 214, 300), text(100, 228, 120)]

describe('planReflow', () => {
  it('gỡ đúng các mảnh chữ của dòng đang sửa, ngắt ở mép cột, giãn dòng theo dòng kế bên', () => {
    const plan = planned([body[1]], body, objects)
    expect(plan?.remove).toEqual([1, 2])
    expect(plan?.block.right).toBeCloseTo(300)
    expect(plan?.block.pitch).toBeCloseTo(14)
    expect(plan?.block.left).toBe(0)
  })

  it('nhiều dòng: giãn dòng lấy từ chính khối, giữ thụt đầu dòng', () => {
    const indented = [span(120, 200, 160), span(100, 214, 300)]
    const plan = planned(indented, body, [text(120, 200, 160), text(100, 214, 300)])
    expect(plan?.block.pitch).toBeCloseTo(14)
    expect(plan?.block.left).toBeCloseTo(-20)
    // Mép phải tính từ đầu dòng đầu (x = 120) tới mép cột (x = 400).
    expect(plan?.block.right).toBeCloseTo(280)
  })

  it('dừng trước chữ ô bên cạnh và nét kẻ dọc của bảng', () => {
    const cell = span(100, 300, 60)
    const next = span(260, 300, 80)
    const row = [text(100, 300, 60), text(260, 300, 80)]
    expect(planned([cell], [...body, cell, next], row)?.block.right).toBeCloseTo(155)
    const rule: PageObject = { kind: 'path', box: { x: 240, y: 280, width: 0.5, height: 40 } }
    expect(planned([cell], [...body, cell, next], [...row, rule])?.block.right).toBeCloseTo(137)
  })

  it('hàng bảng có nét kẻ ngang ngăn giữa: khoảng cách hàng không phải giãn dòng', () => {
    const cell = span(100, 300, 60)
    const below = span(100, 320, 70)
    const border: PageObject = { kind: 'path', box: { x: 90, y: 306, width: 400, height: 0.3 } }
    expect(planned([cell], [cell, below], [text(100, 300, 60), text(100, 320, 70)])?.block.pitch).toBeCloseTo(20)
    expect(planned([cell], [cell, below], [text(100, 300, 60), text(100, 320, 70), border])?.block.pitch).toBeCloseTo(12)
  })

  it('không viết lại khi chữ không nằm ở cấp trang hoặc một mảnh chữ chạy dài quá khối', () => {
    expect(planned([body[1]], body, [{ kind: 'form', box: { x: 0, y: 0, width: 595, height: 842 } }])).toBeNull()
    expect(planned([span(100, 200, 60)], body, [text(100, 200, 180)])).toBeNull()
  })

  it('không viết lại khi các dòng không xếp từ trên xuống', () => {
    expect(planned([body[2], body[1]], body, objects)).toBeNull()
  })

  it('đơn độc trên trang: giãn dòng mặc định 1,2 lần cỡ chữ, không rộng hơn chính nó', () => {
    const alone = span(100, 200, 180)
    const plan = planned([alone], [alone], [text(100, 200, 180)])
    expect(plan?.block.pitch).toBeCloseTo(12)
    expect(plan?.block.right).toBeCloseTo(180)
  })
})

describe('planShift', () => {
  const plan = planned([body[1]], body, objects)
  if (!plan) throw new Error('no plan')

  it('thêm một dòng: mọi thứ dưới chân chữ dời một bước, phần trên và cùng dòng đứng yên', () => {
    const bullet = text(80, 200, 6)
    const border: PageObject = { kind: 'path', box: { x: 60, y: 100, width: 0.5, height: 300 } }
    const rule: PageObject = { kind: 'path', box: { x: 60, y: 205, width: 400, height: 0.5 } }
    const shift = planShift([...objects, bullet, border, rule], plan, 2, A4)
    expect(shift.delta).toBeCloseTo(14)
    expect(shift.move).toEqual([3, 4, 7])
    expect(shift.keep).toBe(2)
    expect(shift.spill).toEqual([])
  })

  it('viền dọc và nền của hàng đang sửa được kéo dài; khung không nối với phần bị dời thì đứng yên', () => {
    const side: PageObject = { kind: 'path', box: { x: 90, y: 190, width: 0.5, height: 16 } }
    const shade: PageObject = { kind: 'path', box: { x: 90, y: 190, width: 320, height: 16 } }
    const framed: PageObject = { kind: 'path', stroked: true, box: { x: 90, y: 190, width: 320, height: 16 } }
    const pageBorder: PageObject = { kind: 'path', box: { x: 20, y: 20, width: 0.5, height: 800 } }
    const nextRow: PageObject = { kind: 'path', box: { x: 90, y: 205.5, width: 320, height: 0.5 } }
    const all = [...objects, side, shade, framed, pageBorder, nextRow]
    const shift = planShift(all, plan, 2, A4)
    expect(shift.move).toEqual([3, 4, 9])
    expect(shift.stretch.map((item) => item.index)).toEqual([5, 6])
    expect(shift.stretch[0].by).toBeCloseTo(14)
    expect(planShift(all, plan, 1, A4).stretch).toEqual([])
  })

  it('chữ ngắn lại không dời gì; xoá hết chữ vẫn giữ một dòng trống', () => {
    expect(planShift(objects, plan, 1, A4).delta).toBe(0)
    expect(planShift(objects, plan, 0, A4).delta).toBe(0)
  })

  describe('khung đi kèm (ô form, ghi chú, dấu tay)', () => {
    // Thân bài của trang mẫu: lề trên 126,3 pt nên mép dưới ở y = 715,7.
    const field = { x: 200, y: 600, width: 300, height: 100 }

    it('bị đẩy quá lề dưới thì trang cắt ở mép trên của nó, dù nội dung trang vẫn vừa', () => {
      expect(planShift(objects, plan, 2, A4, [field]).spill).toEqual([])
      const shift = planShift(objects, plan, 3, A4, [field])
      expect(planShift(objects, plan, 3, A4).spill).toEqual([])
      expect(shift.spill).toHaveLength(1)
      expect(shift.spill[0]).toMatchObject({ objects: [], lines: [0, 0] })
      expect(shift.move).toEqual([3, 4])
      const place = placeOf(field, plan, shift)
      expect(place.page).toBe(1)
      // Mép trên của ô về đúng lề trên của trang mới.
      expect(field.y + place.by).toBeCloseTo(126.3)
    })

    it('khung phía trên khối, và khung vốn đã quá lề dưới từ trước, không gây tràn', () => {
      expect(planShift(objects, plan, 3, A4, [{ x: 200, y: 100, width: 300, height: 60 }]).spill).toEqual([])
      expect(planShift(objects, plan, 3, A4, [{ x: 200, y: 650, width: 300, height: 80 }]).spill).toEqual([])
    })

    it('chỗ cắt do khung gây ra không xẻ ngang dòng chữ khung ấy nằm trên', () => {
      const all = [...objects, text(100, 700, 200)]
      const lined = planned([body[1]], body, all)
      if (!lined) throw new Error('no plan')
      // Vùng bấm của liên kết bắt đầu thấp hơn mép trên dòng chữ 2 pt và thò xuống dưới chân chữ.
      const shift = planShift(all, lined, 2, A4, [{ x: 100, y: 695, width: 200, height: 17 }])
      expect(shift.spill).toHaveLength(1)
      expect(shift.spill[0].objects.map((item) => item.index)).toEqual([5])
      expect(planShift(all, lined, 2, A4).spill).toEqual([])
    })

    it('nhóm radio sang trang mới cả nhóm, không bị cắt giữa các nút', () => {
      const button = (y: number) => ({ box: { x: 100, y, width: 12, height: 12 }, group: 'hinh_thuc' })
      // Nút đầu nằm ngang dòng đang sửa: nó đứng yên nên không tính vào khung của nhóm.
      const buttons = [button(192), button(640), button(665), button(690)]
      const loose = planShift(objects, plan, 3, A4, buttons.map((item) => item.box))
      expect(buttons.map((item) => placeOf(item.box, plan, loose).page)).toEqual([0, 0, 0, 1])

      const frames = riderFrames([...buttons, { box: field }], plan)
      expect(frames[0]).toEqual(buttons[0].box)
      expect(frames[1]).toEqual({ x: 100, y: 640, width: 12, height: 62 })
      expect(frames[3]).toEqual(frames[1])
      expect(frames[4]).toEqual(field)
      const shift = planShift(objects, plan, 3, A4, frames.slice(0, 4))
      expect(placeRiders(buttons, plan, shift).map((place) => place.page)).toEqual([0, 1, 1, 1])
    })

    it('nút radio nằm trong vùng chân trang đứng yên, chỉ rời chỗ khi cả nhóm sang trang mới', () => {
      // Vùng của khối tính từ chân chữ dòng đang sửa (y = 200): chân trang bắt đầu ở y = 685 trên trang.
      const footed = { ...plan, zones: { ...plan.zones, footer: 485 } }
      // Nút cuối nhô lên khỏi vùng chân trang 3 pt nhưng tâm nằm trong đó, như ô form đặt quanh một dòng chữ.
      const buttons = [640, 665, 682].map((y) => ({ box: { x: 100, y, width: 12, height: 12 }, group: 'hinh_thuc' }))
      const frames = riderFrames(buttons, footed)
      expect(frames).toEqual(Array(3).fill({ x: 100, y: 640, width: 12, height: 37 }))

      const pushed = planShift(objects, footed, 3, A4, frames)
      expect(placeRiders(buttons, footed, pushed)).toEqual([{ page: 0, by: 28 }, { page: 0, by: 28 }, { page: 0, by: 0 }])
      const spilled = planShift(objects, footed, 5, A4, frames)
      const places = placeRiders(buttons, footed, spilled)
      expect(places.map((place) => place.page)).toEqual([1, 1, 1])
      expect(new Set(places.map((place) => place.by)).size).toBe(1)
    })
  })

  describe('trang đã đầy', () => {
    // 42 dòng nữa chạy tới sát đáy trang: mép dưới thân bài là chân dòng cuối, lề trên suy ra là 126 pt.
    const rows = Array.from({ length: 42 }, (_, at) => text(100, 242 + at * 14, 300))
    const all = [...objects, ...rows]
    const full = planned([body[1]], body, all)
    if (!full) throw new Error('no plan')
    const indexes = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, at) => from + at)

    it('dòng bị đẩy quá mép dưới thân bài sang một trang mới, đặt lại từ lề trên', () => {
      const shift = planShift(all, full, 2, A4)
      expect(shift.move).toEqual(indexes(3, 45))
      expect(shift.spill).toHaveLength(1)
      const [sheet] = shift.spill
      expect(sheet.objects.map((item) => item.index)).toEqual([46])
      expect(sheet.lines).toEqual([0, 0])
      // Mép trên của dòng ấy (y = 809 trên trang, 609 trong hệ của khối) về đúng lề trên.
      expect(609 + sheet.objects[0].by).toBeCloseTo(full.zones.head)
      expect(planShift(all, full, 4, A4).spill[0].objects.map((item) => item.index)).toEqual([44, 45, 46])
      expect(planShift(all, full, 1, A4).spill).toEqual([])
    })

    it('chữ mới dài hơn cả trang: dòng thừa và phần dưới trải ra nhiều trang mới', () => {
      const shift = planShift(all, full, 70, A4)
      expect(shift.keep).toBe(45)
      expect(shift.move).toEqual([])
      expect(shift.spill.map((sheet) => sheet.lines)).toEqual([
        [45, 70],
        [0, 0],
      ])
      expect(shift.spill[0].objects.map((item) => item.index)).toEqual(indexes(3, 26))
      expect(shift.spill[1].objects.map((item) => item.index)).toEqual(indexes(27, 46))
    })

    it('dấu tay nằm trong phần tràn đi theo sang trang mới', () => {
      const shift = planShift(all, full, 4, A4)
      expect(placeOf({ x: 100, y: 300, width: 50, height: 10 }, full, shift)).toEqual({ page: 0, by: 42 })
      const moved = placeOf({ x: 100, y: 795, width: 50, height: 10 }, full, shift)
      expect(moved.page).toBe(1)
      expect(moved.by).toBeCloseTo(42 + shift.spill[0].lift)
      expect(placeOf({ x: 100, y: 150, width: 50, height: 10 }, full, shift)).toEqual({ page: 0, by: 0 })
    })

    it('ô form cao hơn dòng chữ nó đi kèm vẫn sang trang cùng dòng ấy', () => {
      const shift = planShift(all, full, 4, A4)
      // Dòng đầu của phần tràn có mép trên ở y = 780; ô bao quanh nó nhô lên 5 pt, ô của dòng ngay trên thì ở lại.
      expect(placeOf({ x: 100, y: 775, width: 50, height: 20 }, full, shift).page).toBe(1)
      expect(placeOf({ x: 100, y: 761, width: 50, height: 20 }, full, shift).page).toBe(0)
    })
  })

  it('gộp nhiều dòng thành ít dòng hơn thì kéo phần dưới lên', () => {
    const merged = planned([body[1], body[2]], body, objects)
    if (!merged) throw new Error('no plan')
    const shift = planShift(objects, merged, 1, A4)
    expect(shift.delta).toBeCloseTo(-14)
    expect(shift.move).toEqual([4])
  })
})

describe('trang hai cột có chân trang', () => {
  // Hai cột 220 pt cách nhau 40 pt, 30 dòng mỗi cột; tiêu đề và đoạn kết trải cả hai cột; chân trang ở đáy.
  const rows = (x: number, count: number) => Array.from({ length: count }, (_, at) => ({ x, y: 140 + at * 14, width: at % 3 === 2 ? 90 : 220 }))
  const page = (rightRows: number) => {
    const lines = [{ x: 60, y: 100, width: 480 }, ...rows(60, 30), ...rows(320, rightRows), { x: 60, y: 620, width: 480 }, { x: 250, y: 800, width: 90 }]
    return { spans: lines.map((line) => span(line.x, line.y, line.width)), objects: lines.map((line) => text(line.x, line.y, line.width)) }
  }
  const LEFT = Array.from({ length: 25 }, (_, at) => at + 6)

  it('chỉ đẩy cột đang sửa; đoạn trải ngang phía dưới đi theo, chân trang đứng yên', () => {
    const { spans, objects: all } = page(30)
    const plan = planned([spans[5]], spans, all)
    if (!plan) throw new Error('no plan')
    expect(plan.zones.columns?.right).toBeCloseTo(240)
    expect(plan.zones.footer).toBeCloseTo(597)
    const shift = planShift(all, plan, 2, A4)
    expect(shift.move).toEqual(LEFT)
    expect(shift.tail).toEqual([61])
    expect(shift.tailDelta).toBeCloseTo(14)
    expect(shift.spill).toEqual([])
    expect(placeOf({ x: 330, y: 300, width: 80, height: 10 }, plan, shift).by).toBe(0)
    expect(placeOf({ x: 70, y: 300, width: 80, height: 10 }, plan, shift).by).toBeCloseTo(14)
    expect(placeOf({ x: 70, y: 630, width: 80, height: 10 }, plan, shift).by).toBeCloseTo(14)
    expect(placeOf({ x: 250, y: 795, width: 80, height: 10 }, plan, shift).by).toBe(0)
  })

  it('cột bên cạnh dài hơn thì phần dưới vùng hai cột không phải nhúc nhích', () => {
    const { spans, objects: all } = page(33)
    const plan = planned([spans[5]], spans, all)
    if (!plan) throw new Error('no plan')
    const shift = planShift(all, plan, 3, A4)
    expect(shift.move).toEqual(LEFT)
    expect(shift.tailDelta).toBe(0)
    expect(shift.tail).toEqual([])
    // Ba dòng thừa của cột bên kia: cột này thêm bốn dòng mới đẩy phần dưới đúng một dòng.
    expect(planShift(all, plan, 5, A4).tailDelta).toBeCloseTo(14)
  })

  it('chữ mới ngắt ở mép cột kể cả khi hàng bên kia khe cột đang trống', () => {
    const { spans, objects: all } = page(30)
    const beside = spans.filter((_, at) => at !== 35)
    expect(planned([spans[5]], beside, all)?.block.right).toBeCloseTo(220)
  })

  it('thân bài không lấn vào lề dưới và chân trang: dòng thừa sang trang mới, chân trang ở lại', () => {
    const { spans, objects: all } = page(30)
    const plan = planned([spans[61]], spans, all)
    if (!plan) throw new Error('no plan')
    // Đoạn kết đứng một mình nên giãn dòng mặc định 12 pt; lề dưới (bằng lề trên, 93 pt) cách chân chữ của nó 129 pt.
    expect(plan.zones.floor).toBeCloseTo(129)
    expect(planShift(all, plan, 11, A4).spill).toEqual([])
    const shift = planShift(all, plan, 12, A4)
    expect(shift.keep).toBe(11)
    expect(shift.spill.map((sheet) => [sheet.lines, sheet.objects])).toEqual([[[11, 12], []]])
  })
})

describe('chữ dọc', () => {
  // Chữ xoay 90° ngược chiều kim đồng hồ: chạy từ dưới lên, "xuống dòng" là sang phải.
  const vertical = span(300, 500, 200, 'dọc', 90)
  const plan = planned([vertical], [vertical], [{ kind: 'text', box: { x: 293, y: 300, width: 9, height: 200 }, anchor: { x: 300, y: 500 } }])
  if (!plan) throw new Error('no plan')

  it('dòng mới và phần bị đẩy đi theo chiều xuống của chính dòng chữ', () => {
    expect(plan.remove).toEqual([0])
    expect(reflowLineStart(plan.block, 1)).toEqual({ x: 312, y: 500 })
    expect(blockShift(plan.block, 12)).toEqual({ x: 12, y: 0 })
    expect(isBelowBlock({ x: 320, y: 300, width: 9, height: 200 }, plan.block)).toBe(true)
    expect(isBelowBlock({ x: 280, y: 300, width: 9, height: 200 }, plan.block)).toBe(false)
  })
})

describe('reflowLines', () => {
  const chars = (line: string) => line.length

  it('dòng đầu và các dòng sau ngắt ở cùng mép phải dù lệch mép trái', () => {
    const block = { origin: { x: 20, y: 0 }, turn: 0 as const, size: 10, lines: [], left: -4, right: 8, pitch: 12 }
    expect(reflowLines('Hợp đồng thi công gói thầu', block, chars)).toEqual(['Hợp đồng', 'thi công gói', 'thầu'])
    expect(reflowLines('', block, chars)).toEqual([])
  })
})
