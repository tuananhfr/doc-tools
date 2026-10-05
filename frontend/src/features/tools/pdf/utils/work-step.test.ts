import { describe, expect, it } from 'vitest'
import { createPacer } from './work-step'

function clock() {
  let time = 0
  let waits = 0
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms
    },
    wait: async () => {
      waits++
    },
    waits: () => waits,
  }
}

describe('createPacer', () => {
  it('chỉ nhường luồng khi đã chạy liền quá ngân sách', async () => {
    const c = clock()
    const pace = createPacer(40, c.now, c.wait)
    c.advance(10)
    await pace()
    expect(c.waits()).toBe(0)
    c.advance(35)
    await pace()
    expect(c.waits()).toBe(1)
    // Đồng hồ đếm lại sau mỗi lần nhường.
    c.advance(20)
    await pace()
    expect(c.waits()).toBe(1)
  })

  it('ném ngay khi đã huỷ, kể cả chưa hết ngân sách', async () => {
    const c = clock()
    const pace = createPacer(40, c.now, c.wait)
    const controller = new AbortController()
    controller.abort()
    await expect(pace(controller.signal)).rejects.toThrow()
  })

  it('huỷ trong lúc đang nhường vẫn bị bắt khi quay lại', async () => {
    const c = clock()
    const controller = new AbortController()
    const pace = createPacer(40, c.now, async () => controller.abort())
    c.advance(50)
    await expect(pace(controller.signal)).rejects.toThrow()
  })
})
