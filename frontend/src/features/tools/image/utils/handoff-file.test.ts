import { describe, expect, it } from 'vitest'
import { idPhotoFill, outputFile } from './handoff-file'

describe('handoff file helpers', () => {
  it('puts a white background under a transparent cut-out before it becomes a JPEG ID photo', () => {
    expect(idPhotoFill('transparent')).toBe('#ffffff')
    expect(idPhotoFill('#4a90d9')).toBe('#4a90d9')
  })

  it('turns a flow output into a named file of the same type', async () => {
    const file = outputFile({ name: 'anh - 3x4.jpg', blob: new Blob(['jpeg'], { type: 'image/jpeg' }) })
    expect(file.name).toBe('anh - 3x4.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(await file.text()).toBe('jpeg')
  })
})
