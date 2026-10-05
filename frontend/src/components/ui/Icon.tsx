import type { CSSProperties } from 'react'

export interface IconProps {
  /**
   * Ten icon cua Bootstrap Icons, KHONG kem tien to `bi-`.
   * Tra cuu: https://icons.getbootstrap.com/
   */
  name: string
  /** Co chu (px). Mac dinh ke thua font-size cua the cha. */
  size?: number
  /** Mau - nen truyen bien token, vd `var(--erp-intelligence)`. */
  color?: string
  className?: string
  style?: CSSProperties
  /** Icon trang tri thi de mac dinh (aria-hidden); icon mang nghia thi dat label. */
  label?: string
}

/**
 * Cong duy nhat de dung Bootstrap Icons trong ung dung.
 *
 * Nho lop nay, doi bo icon sau nay chi sua mot file, va moi icon deu mac dinh
 * `aria-hidden` - dung quy tac "icon + nhan chu", icon khong tu mang nghia
 * (ERPcons_Design_System.md, muc 05 & 11).
 */
export function Icon({ name, size, color, className, style, label }: IconProps) {
  return (
    <i
      className={`bi bi-${name}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, color, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    />
  )
}
