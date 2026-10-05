import type { SemanticTokens } from '@/styles/tokens'
import type { CompassRole } from './compass-geometry'

/** Màu của la bàn theo vai trò. Lấy từ token của theme — bản xem và ảnh xuất dùng chung một bảng. */
export type CompassPalette = Record<CompassRole, string> & { halo: string }

export function compassPalette(tokens: SemanticTokens): CompassPalette {
  return {
    disc: tokens.surface,
    ring: tokens.textPrimary,
    tick: tokens.textSecondary,
    'tick-major': tokens.textPrimary,
    sector: tokens.borderStrong,
    label: tokens.textPrimary,
    // Kim Bắc đỏ là quy ước của mọi la bàn — trùng màu nhận diện, đúng chỗ dùng nó.
    'label-north': tokens.brand,
    north: tokens.brand,
    target: tokens.info,
    'target-active': tokens.construction,
    sun: tokens.warning,
    trace: tokens.textPrimary,
    'trace-tag': tokens.construction,
    draft: tokens.actionSecondary,
    halo: tokens.surface,
  }
}
