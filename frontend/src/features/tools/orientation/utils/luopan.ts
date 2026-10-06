import { LUOPAN_CONVENTION, MOUNTAIN_WIDTH, MOUNTAINS } from '../config/luopan'
import type { LuopanConvention, MountainReading } from '../types/luopan.types'
import { normalizeDeg } from './azimuth'

const HALF = MOUNTAIN_WIDTH / 2
// Sai số số thực: 22,5 − 1e-12 vẫn phải coi là ranh, 180,00000001 vẫn là đúng tâm.
const EPSILON = 1e-9

/** Toạ = phía sau lưng của hướng — ngược 180°. */
export function sittingOf(facing: number): number {
  return normalizeDeg(facing + 180)
}

/** Ranh `boundary` (độ) có phải ranh giữa hai hướng (hai quái) không — các ranh 22,5° + 45°·k. */
function isSectorBoundary(boundary: number): boolean {
  const rest = normalizeDeg(boundary - 22.5) % 45
  return rest < EPSILON || 45 - rest < EPSILON
}

/**
 * Sơn chứa một góc. Góc nằm ĐÚNG ranh thuộc sơn kế tiếp theo chiều kim đồng hồ —
 * cùng quy tắc với `directionOf` để tên hướng và tên sơn không bao giờ vênh nhau.
 */
export function mountainOf(azimuth: number, convention: LuopanConvention = LUOPAN_CONVENTION): MountainReading {
  const deg = normalizeDeg(azimuth)
  const index = Math.floor((deg + HALF) / MOUNTAIN_WIDTH) % MOUNTAINS.length
  const mountain = MOUNTAINS[index]
  let offset = deg - mountain.center
  if (offset > 180) offset -= 360
  if (Math.abs(offset) < EPSILON) offset = 0

  const toward = offset === 0 ? null : MOUNTAINS[(index + (offset > 0 ? 1 : MOUNTAINS.length - 1)) % MOUNTAINS.length]
  // Ranh gần nhất: phía đang lệch về; đúng tâm thì cách ranh nửa sơn, không thể rơi vào không vong.
  const boundary = mountain.center + (offset >= 0 ? HALF : -HALF)
  const nearBoundary = HALF - Math.abs(offset) <= convention.voidWindow + EPSILON
  return {
    mountain,
    offset,
    toward,
    void: nearBoundary ? (isSectorBoundary(boundary) ? 'MAJOR' : 'MINOR') : null,
  }
}
