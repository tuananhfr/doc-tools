import { describe, expect, it } from 'vitest'
import { autoZoomStep, initialAutoZoomState, type AutoZoomState } from './auto-zoom'
import type { CameraCrop } from './camera-geometry'

const small = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 }
const confirmed: AutoZoomState = { candidate: small, streak: 2, lastZoomAt: 0 }

describe('automatic QR zoom', () => {
  it('requires three stable observations before increasing zoom by one step', () => {
    let state = initialAutoZoomState()
    for (const now of [800, 1600]) {
      const result = autoZoomStep(state, small, now, 1, 3)
      expect(result.zoom).toBeNull()
      state = result.state
    }
    const result = autoZoomStep(state, small, 2400, 1, 3)
    expect(result.zoom).toBe(1.25)
    expect(result.state.streak).toBe(0)
  })

  it('never zooms empty scenes and discards a candidate after it disappears', () => {
    const absent = autoZoomStep(confirmed, null, 2400, 1, 3)
    expect(absent.zoom).toBeNull()
    expect(autoZoomStep(absent.state, small, 3200, 1, 3).zoom).toBeNull()
  })

  it('waits when the code moves or changes size', () => {
    for (const candidate of [{ ...small, x: 0.6 }, { ...small, width: 0.3 }]) {
      expect(autoZoomStep(confirmed, candidate, 2400, 1, 3).zoom).toBeNull()
    }
  })

  it('keeps sufficiently large QR codes and edge QR codes at their current zoom', () => {
    for (const candidate of [{ x: 0.2, y: 0.2, width: 0.5, height: 0.5 }, { ...small, x: 0.03 }]) {
      const state = { ...confirmed, candidate }
      expect(autoZoomStep(state, candidate, 2400, 1, 3).zoom).toBeNull()
    }
  })

  it('respects the camera maximum and the automatic 3x ceiling', () => {
    expect(autoZoomStep(confirmed, small, 2400, 2.9, 4).zoom).toBe(3)
    expect(autoZoomStep(confirmed, small, 2400, 3, 4).zoom).toBeNull()
    expect(autoZoomStep(confirmed, small, 2400, 1, 1.1).zoom).toBe(1.1)
  })

  it('leaves time between adjustments', () => {
    expect(autoZoomStep({ ...confirmed, lastZoomAt: 2200 }, small, 2400, 1, 3).zoom).toBeNull()
  })

  it('reconfirms the QR after every zoom change', () => {
    const result = autoZoomStep(confirmed, small, 2400, 1, 3)
    const enlarged: CameraCrop = { x: 0.375, y: 0.375, width: 0.25, height: 0.25 }
    expect(autoZoomStep(result.state, enlarged, 4000, 1.25, 3).zoom).toBeNull()
  })
})
