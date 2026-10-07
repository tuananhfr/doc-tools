import type { CameraCrop } from './camera-geometry'

export interface AutoZoomState {
  candidate: CameraCrop | null
  streak: number
  lastZoomAt: number
}

export function initialAutoZoomState(): AutoZoomState {
  return { candidate: null, streak: 0, lastZoomAt: 0 }
}

/** Requires a stable, small QR and preserves its bounds inside the next crop. */
export function autoZoomStep(state: AutoZoomState, candidate: CameraCrop | null, now: number, zoom: number, maxZoom: number): { state: AutoZoomState; zoom: number | null } {
  if (!candidate) return { state: { ...state, candidate: null, streak: 0 }, zoom: null }
  const previous = state.candidate
  const stable = previous && Math.abs(candidate.x + candidate.width / 2 - previous.x - previous.width / 2) < 0.06
    && Math.abs(candidate.y + candidate.height / 2 - previous.y - previous.height / 2) < 0.06
    && Math.abs(candidate.width / previous.width - 1) < 0.2
    && Math.abs(candidate.height / previous.height - 1) < 0.2
  const next = { ...state, candidate, streak: stable ? state.streak + 1 : 1 }
  const desired = Math.min(3, maxZoom, zoom + 0.25)
  const ratio = desired / zoom
  if (next.streak < 3 || now - state.lastZoomAt < 1200 || desired <= zoom || Math.max(candidate.width, candidate.height) >= 0.42) return { state: next, zoom: null }
  const left = 0.5 + (candidate.x - 0.5) * ratio
  const top = 0.5 + (candidate.y - 0.5) * ratio
  if (left < 0.03 || top < 0.03 || left + candidate.width * ratio > 0.97 || top + candidate.height * ratio > 0.97) return { state: next, zoom: null }
  return { state: { candidate: null, streak: 0, lastZoomAt: now }, zoom: desired }
}
