import { describe, expect, it } from 'vitest'
import { allChoices, choiceKey, groupScan, scanPlan, type PageScan, type ScanItem } from './scan-plan'

const clean: PageScan = { blank: false, skew: null, paper: null, canDeskew: true, canCrop: true }

function item(id: string, scan: Partial<PageScan>): ScanItem {
  return { page: { id, sourceId: 's', pageIndex: 0, rotation: 0 }, position: Number(id.slice(1)), scan: { ...clean, ...scan } }
}

const items = [
  item('p1', {}),
  item('p2', { skew: 2.4, paper: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 } }),
  // Trang trắng nghiêng / có viền: chỉ gợi ý bỏ.
  item('p3', { blank: true, skew: 1, paper: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } }),
  // Có lớp chữ: không chỉnh, không cắt.
  item('p4', { skew: 2, canDeskew: false, canCrop: false }),
  // Đã đánh dấu: cắt được, không chỉnh nghiêng.
  item('p5', { skew: 1.5, paper: { x: 0.1, y: 0, width: 0.8, height: 1 }, canDeskew: false }),
]

describe('groupScan', () => {
  it('sorts findings into what can actually be fixed', () => {
    const groups = groupScan(items, 6)
    expect(groups.blank.map((entry) => entry.page.id)).toEqual(['p3'])
    expect(groups.skew.map((entry) => entry.page.id)).toEqual(['p2'])
    expect(groups.crop.map((entry) => entry.page.id)).toEqual(['p2', 'p5'])
    // p4 có lớp chữ + một trang gộp ảnh không có kết quả.
    expect(groups.skipped).toBe(2)
  })
})

describe('scanPlan', () => {
  it('merges deskew and crop of one page into a single fix', () => {
    const groups = groupScan(items, 5)
    const plan = scanPlan(groups, allChoices(groups))
    expect(plan.remove).toEqual(['p3'])
    expect([...plan.fixes]).toEqual([
      ['p2', { skew: 2.4, crop: true }],
      ['p5', { skew: null, crop: true }],
    ])
  })

  it('follows what the user unticked', () => {
    const groups = groupScan(items, 5)
    const chosen = allChoices(groups)
    chosen.delete(choiceKey('p3', 'blank'))
    chosen.delete(choiceKey('p2', 'crop'))
    chosen.delete(choiceKey('p5', 'crop'))
    const plan = scanPlan(groups, chosen)
    expect(plan.remove).toEqual([])
    expect([...plan.fixes]).toEqual([['p2', { skew: 2.4, crop: false }]])
  })
})
