import type { Rect, Rotation, Size } from '../types/image.types'
import { isNeutral, NEUTRAL_ADJUST, type Adjust } from './adjust'
import { fullRect, isFullRect, rectForAspect, rotatedSize, rotateRect } from './crop-rect'

export type AspectKey = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

/** Rộng / cao của từng tỉ lệ khung; `free` = kéo tự do. */
export const ASPECT_RATIO: Record<AspectKey, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

export const ASPECT_OPTIONS: { value: AspectKey; label: string }[] = [
  { value: 'free', label: 'Tự do' },
  { value: '1:1', label: '1:1 — vuông' },
  { value: '4:3', label: '4:3 — ngang' },
  { value: '3:4', label: '3:4 — dọc' },
  { value: '16:9', label: '16:9 — ngang rộng' },
  { value: '9:16', label: '9:16 — dọc dài' },
]

// Ảnh xoay 90° thì khung 4:3 đang kéo thành 3:4 — đổi tỉ lệ theo để khung khỏi nhảy.
const TURNED: Record<AspectKey, AspectKey> = { free: 'free', '1:1': '1:1', '4:3': '3:4', '3:4': '4:3', '16:9': '9:16', '9:16': '16:9' }

/** Mọi thứ người dùng đã chỉnh trên một ảnh. `rect` theo điểm ảnh của ảnh ĐÃ xoay. */
export interface CropState extends Adjust {
  rotation: Rotation
  rect: Rect
  aspect: AspectKey
}

export function initialCrop(size: Size): CropState {
  return { ...NEUTRAL_ADJUST, rotation: 0, rect: fullRect(size), aspect: 'free' }
}

/** Chưa cắt, chưa xoay, chưa chỉnh — lưu ra chỉ được đúng ảnh gốc. */
export function isPristine(state: CropState, size: Size): boolean {
  return state.rotation === 0 && isNeutral(state) && isFullRect(state.rect, size)
}

/** Chọn tỉ lệ: khung nhảy về khung lớn nhất đúng tỉ lệ; `free` thì giữ khung đang có. */
export function withAspect(state: CropState, size: Size, aspect: AspectKey): CropState {
  const ratio = ASPECT_RATIO[aspect]
  return { ...state, aspect, rect: ratio ? rectForAspect(rotatedSize(size, state.rotation), ratio) : state.rect }
}

/** Xoay 90°: khung cắt và tỉ lệ đi theo ảnh. */
export function turned(state: CropState, size: Size, direction: 'cw' | 'ccw'): CropState {
  return {
    ...state,
    rotation: ((state.rotation + (direction === 'cw' ? 90 : 270)) % 360) as Rotation,
    rect: rotateRect(state.rect, rotatedSize(size, state.rotation), direction),
    aspect: TURNED[state.aspect],
  }
}
