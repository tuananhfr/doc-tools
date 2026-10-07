import { translateKey } from '@/i18n/runtime'
import type { Divisions } from '../types/orientation.types'

/** Tám quái theo tên chuẩn Kinh Dịch; tên hiển thị nằm ở `orientation:terms.trigrams`. */
export type TrigramId = 'KAN' | 'GEN' | 'ZHEN' | 'XUN' | 'LI' | 'KUN' | 'DUI' | 'QIAN'

export type ElementId = 'METAL' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH'

/*
 * Thuật ngữ phong thuỷ là chữ hiển thị, không phải dữ liệu: dữ liệu chỉ giữ chỉ số / mã,
 * tên lấy theo ngôn ngữ trang lúc dùng — cả trên màn hình lẫn trong tệp xuất.
 */

export function directionLabel(divisions: Divisions, index: number): { name: string; short: string } {
  return {
    name: translateKey(`orientation:terms.directions${divisions}.${index}.name`),
    short: translateKey(`orientation:terms.directions${divisions}.${index}.short`),
  }
}

export const mountainName = (index: number) => translateKey(`orientation:terms.mountains.${index}`)
export const trigramName = (id: TrigramId) => translateKey(`orientation:terms.trigrams.${id}`)
export const elementName = (id: ElementId) => translateKey(`orientation:terms.elements.${id}`)
export const napAmName = (index: number) => translateKey(`orientation:terms.napAm.${index}`)
export const starName = (id: string) => translateKey(`orientation:stars.${id}.name`)
export const starMeaning = (id: string) => translateKey(`orientation:stars.${id}.meaning`)
export const groupName = (id: string) => translateKey(`orientation:groups.${id}.name`)
/** "Đông tứ" — tên nhóm khi nói về trạch (nhà), không kèm "mệnh". */
export const groupHouseName = (id: string) => translateKey(`orientation:groups.${id}.house`)
