import dayjs from 'dayjs'
import { appConfig } from '@/config/app.config'

export function formatDate(value?: string | number | Date | null, fallback = '—') {
  if (!value) return fallback
  const d = dayjs(value)
  return d.isValid() ? d.format(appConfig.dateFormat) : fallback
}

export function formatDateTime(value?: string | number | Date | null, fallback = '—') {
  if (!value) return fallback
  const d = dayjs(value)
  return d.isValid() ? d.format(appConfig.dateTimeFormat) : fallback
}

/**
 * `Intl.NumberFormat` dùng LẠI theo (locale, tuỳ chọn).
 *
 * Dựng một formatter đắt gấp hàng chục lần một lần `.format()`, mà các hàm dưới
 * đây được gọi cho TỪNG ô của bảng và TỪNG thẻ kanban: đo 03/10/2026 ở màn Phiếu
 * xuất (1.700 thẻ) một lượt vẽ dựng hơn 7.500 formatter, `formatMoney` chiếm
 * hàng trăm ms. Kết quả định dạng không đổi — chỉ thôi dựng lại cùng một thứ.
 */
const numberFormatters = new Map<string, Intl.NumberFormat>()

function numberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${appConfig.locale}|${options ? JSON.stringify(options) : ''}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(appConfig.locale, options)
    numberFormatters.set(key, formatter)
  }
  return formatter
}

export function formatNumber(value?: number | null, fallback = '—') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return numberFormatter().format(value)
}

/**
 * Ty le -> "+1,61%" / "-3,80%".
 *
 * PHAI di qua Intl chu khong dung `.toFixed(2) + '%'`.
 * ============================================================================
 * `toFixed` luon dung DAU CHAM lam dau thap phan, trong khi `formatNumber` o
 * tren dung locale vi-VN nen dau cham la dau HANG NGHIN. De canh nhau tren
 * cung mot man hinh - "12.45%" ben canh "15.682" - thi dau cham mang hai nghia
 * khac nhau va nguoi doc khong the biet 12.45% la muoi hai phay bon lam hay
 * muoi hai nghin.
 *
 * `signed` mac dinh BAT vi ty le trong bao cao gia gan nhu luon la muc thay
 * doi; dau + / - la thong tin chinh, khong phai trang tri.
 */
export function formatPercent(
  value?: number | null,
  options: { signed?: boolean; digits?: number; fallback?: string } = {},
) {
  const { signed = true, digits = 2, fallback = '—' } = options
  if (value === null || value === undefined || Number.isNaN(value)) return fallback

  const text = numberFormatter({
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value))

  const sign = !signed ? '' : value < 0 ? '−' : '+'
  return `${sign}${text}%`
}

/**
 * So tien -> "1.234.567 VND".
 *
 * `currencyDisplay: 'code'` chu KHONG phai mac dinh `'symbol'`: mac dinh cho ra
 * ky hieu "₫", ma chung tu ke toan cua cong ty ghi don vi bang MA TIEN TE
 * (yeu cau nghiep vu 2026-08-28). Doi o day la doi mot cho cho ca app - 356
 * cho goi ham nay, gom the kanban, bang, form va cac dai chi so.
 *
 * Ban in KHONG dung ham nay: to trinh tu ghi "VND" o nhan cot / `suffix` cua
 * YAML nen no chi can SO TRAN, xem `components/print-form/resolve.ts`.
 */
export function formatMoney(value?: number | null, fallback = '—') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return numberFormatter({
    style: 'currency',
    currency: appConfig.currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Lay chu cai dau dung cho Avatar. */
/**
 * So PHUT -> "2h15m" / "45m".
 *
 * Backend cham cong tra PHUT o moi cho (`lateMinutes`, `earlyMinutes`) vi phut
 * cong tru duoc; gio chi la cach BAY ra man hinh nen phep doi nam o tang trinh
 * bay. Dat o day chu khong de rieng trong tung man: dai chi so va luoi lich
 * tuan cung hien mot con so, hai ban sao la som muon hai cho lech nhau.
 */
export function formatMinutes(total?: number | null, fallback = '0') {
  if (!total || total <= 0) return fallback

  const hours = Math.floor(total / 60)
  const minutes = total % 60

  if (!hours) return `${minutes}m`
  return minutes ? `${hours}h${minutes}m` : `${hours}h`
}

export function initials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts.at(-2)?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')
}

/**
 * Dung luong tep -> chuoi doc duoc ("1,4 MB").
 *
 * Dung boi 1024 chu khong phai 1000: do la don vi ma Drupal, he dieu hanh va
 * chinh nguoi dung dung khi noi ve kich thuoc tep. Lech 2,4% giua hai cach o
 * moi bac, du de nguoi dung thay so khac voi con so Windows bao.
 */
export function formatFileSize(bytes?: number | null, fallback = '—') {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return fallback
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`
}
