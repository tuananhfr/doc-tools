/** Nam trang thai chuan cua he thong (ERPcons_Design_System.md, muc 05). */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Icon di kem tung tone.
 *
 * Mau khong bao gio duoc la tin hieu DUY NHAT (muc 05 & 11), nen moi chip
 * trang thai - `StatusTag` hay chip nho o chan cot lich tuan - deu phai deo
 * dung icon nay. Hai ban sao la ngay mot cho doi icon con cho kia thi khong.
 *
 * Dat o FILE RIENG chu khong trong `StatusTag.tsx`: eslint
 * `react-refresh/only-export-components` cam mot file component xuat them
 * hang so, va vi phạm luat do la HMR mat tac dung cho ca file.
 */
export const STATUS_TONE_ICON: Record<StatusTone, string> = {
  success: 'check-circle',
  warning: 'exclamation-triangle',
  danger: 'x-circle',
  info: 'info-circle',
  neutral: 'dash-circle',
}
