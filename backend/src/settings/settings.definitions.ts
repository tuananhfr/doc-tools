/**
 * Operational switches an admin may change at runtime. Mail and GoClaw settings, secrets included,
 * live in integration.definitions.ts instead: they need a password check and sealed storage.
 */
interface BooleanSetting { type: 'boolean'; default: boolean; label: string; help: string }
interface IntegerSetting { type: 'integer'; default: number; min: number; max: number; label: string; help: string; unit?: string }
interface ChoiceListSetting { type: 'choices'; default: readonly string[]; choices: readonly string[]; label: string; help: string }

export type SettingDefinition = BooleanSetting | IntegerSetting | ChoiceListSetting

export const SETTINGS = {
  'codes.guestHourly': { type: 'integer', default: 10, min: 1, max: 100, unit: 'mã/giờ', label: 'Trần tạo QR động Free', help: 'Tính theo IP đã băm trong từng giờ UTC; dùng chung giữa các instance.' },
  'auth.signupOpen': { type: 'boolean', default: true, label: 'Cho phép tạo tài khoản mới', help: 'Tắt thì email chưa có tài khoản không nhận được mã đăng nhập; tài khoản cũ vẫn đăng nhập bình thường.' },
  'contributions.guestHourly': { type: 'integer', default: 5, min: 1, max: 100, unit: 'đề xuất/giờ', label: 'Trần đề xuất của khách', help: 'Tính theo địa chỉ IP, cửa sổ trượt một giờ.' },
  'contributions.accountHourly': { type: 'integer', default: 10, min: 1, max: 200, unit: 'đề xuất/giờ', label: 'Trần đề xuất của tài khoản', help: 'Tính theo tài khoản, cửa sổ trượt một giờ.' },
  'feedback.autoDedupe': { type: 'boolean', default: true, label: 'Tự gộp góp ý trùng đã đóng', help: 'Bật: góp ý giống một góp ý đã xử lý xong được nhận và gộp vào đó (DEDUPED). Tắt: báo trùng (409) như trước. Trùng góp ý còn đang mở luôn bị báo trùng.' },
  'cloud.maxItems': { type: 'integer', default: 500, min: 10, max: 5000, unit: 'mục', label: 'Trần mục đã lưu mỗi người', help: 'Gồm cả kết quả đã lưu và công cụ yêu thích. Hạ trần không xoá mục cũ, chỉ chặn lưu thêm.' },
  'cloud.maxMegabytes': { type: 'integer', default: 20, min: 1, max: 500, unit: 'MB', label: 'Trần dung lượng đã lưu mỗi người', help: 'Tổng kích thước dữ liệu kết quả đã lưu. Hạ trần không xoá mục cũ, chỉ chặn lưu thêm.' },
  'sources.staleDays': { type: 'integer', default: 90, min: 7, max: 730, unit: 'ngày', label: 'Ngưỡng "có thể đã cũ" của nguồn pháp lý', help: 'Số liệu có ngày kiểm nguồn cũ hơn ngần này ngày hiện cảnh báo vàng ở tiền điện, lương, đổi địa chỉ.' },
} as const satisfies Record<string, SettingDefinition>

export type SettingKey = keyof typeof SETTINGS
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K] extends BooleanSetting ? boolean
  : (typeof SETTINGS)[K] extends IntegerSetting ? number : string[]

export function isSettingKey(value: unknown): value is SettingKey { return typeof value === 'string' && Object.hasOwn(SETTINGS, value) }

/** Returns the normalized value, or null when it does not fit the definition. */
export function parseSettingValue(key: SettingKey, value: unknown): boolean | number | string[] | null {
  // Widened on purpose: no choices setting exists yet, and narrowing would type that branch as `never`.
  const definition = SETTINGS[key] as SettingDefinition
  if (definition.type === 'boolean') return typeof value === 'boolean' ? value : null
  if (definition.type === 'integer') return Number.isInteger(value) && (value as number) >= definition.min && (value as number) <= definition.max ? value as number : null
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && definition.choices.includes(item))) return null
  return [...new Set(value as string[])]
}
