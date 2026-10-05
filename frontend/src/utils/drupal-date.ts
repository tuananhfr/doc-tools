/**
 * Doi mocs thoi gian cua Drupal sang thu JavaScript doc duoc — va nguoc lai.
 *
 * ============================================================================
 * BA HINH DANG NGAY THANG, BA CACH DOC KHAC NHAU
 * ============================================================================
 * | Kieu truong | Drupal gui | Doc bang |
 * | --- | --- | --- |
 * | `created` / `changed` | timestamp GIAY | `fromUnix()` |
 * | `datetime_type: datetime` | `'Y-m-d\TH:i:s'` theo UTC, KHONG hau to | `fromDrupalDateTime()` |
 * | `datetime_type: date` | `'Y-m-d'` thuan ngay | CAT CHUOI, dung parse |
 *
 * Hai dong dau la cho de sai nhat, va ca hai deu hong IM LANG:
 *   - thieu chu 'Z' thi `new Date()` doc chuoi la gio DIA PHUONG, mot ban ghi
 *     15:21 (GMT+7) hien ra 08:21;
 *   - dua timestamp GIAY vao `new Date()` la ra nam 1970.
 *
 * Ngay THUAN thi tuyet doi khong cho di qua `fromDrupalDateTime()`: ham do them
 * 'Z' roi `toISOString()`, tuc dua mot ngay khong co gio vao he quy chieu mui
 * gio — o GMT+7 nhin van dung nen loi khong lo ra, nhung may dat mui gio AM se
 * thay ngay LUI MOT HOM.
 *
 * ============================================================================
 * VI SAO O `utils/` CHU KHONG O TUNG MAPPER
 * ============================================================================
 * Bon ham nay tung nam trong CA HAI `advance.mapper.ts` va `task.mapper.ts`,
 * chep nhau tung dong. Man Van ban la cho thu ba can chung, ma feature khong
 * duoc import xuyen vao service cua feature khac — nen cho dung la day. Hai
 * mapper cu gio chi con RE-EXPORT tu file nay.
 */

/**
 * Truong `datetime` cua Drupal luu UTC dang `'Y-m-d\TH:i:s'`, KHONG kem mui gio.
 *
 * Them 'Z' truoc khi parse la du. Chuoi da co hau to mui gio (backend khac, du
 * lieu cu) thi giu nguyen — kiem bang regex chu dung noi bua, `'...+07:00Z'`
 * la mot ngay khong hop le va ra `null`.
 */
export function fromDrupalDateTime(raw?: string | null): string | null {
  if (!raw) return null

  const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Chieu nguoc lai: gia tri cua `<input type="datetime-local">`
 * (`'YYYY-MM-DDTHH:mm'`, gio dia phuong) -> UTC dung dinh dang Drupal cho.
 */
export function toDrupalDateTime(local?: string | null): string | null {
  if (!local) return null

  const date = new Date(local)
  if (Number.isNaN(date.getTime())) return null

  // Bo phan mili giay va chu 'Z' - Drupal chi nhan 'Y-m-d\TH:i:s'.
  return date.toISOString().slice(0, 19)
}

/** ISO -> gia tri dien vao `<input type="datetime-local">` (gio dia phuong). */
export function toDateTimeLocalInput(iso?: string | null): string {
  if (!iso) return ''

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  // Tru offset de `toISOString()` in ra gio dia phuong thay vi UTC.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** Timestamp GIAY -> ISO. Nhan 0/null (ban ghi cu thieu du lieu) thanh chuoi rong. */
export function fromUnix(seconds?: number | null): string {
  if (!seconds) return ''

  const date = new Date(seconds * 1000)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

/** ISO 8601 theo múi giờ máy, vd 2026-09-24T08:09:12+07:00 — server bắt buộc có múi giờ. */
export function isoLocal(date: Date): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset >= 0 ? '+' : '-'}${pad(offset / 60)}:${pad(offset % 60)}`
}
