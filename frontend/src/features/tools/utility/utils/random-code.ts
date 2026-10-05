/** Số nguyên ngẫu nhiên ĐỀU trong [0, bound). */
export type Rng = (bound: number) => number

/**
 * Nguồn ngẫu nhiên mật mã. Lấy mẫu loại bỏ chứ không `% bound`: 2³² không chia
 * hết cho 62 nên phép chia dư làm vài ký tự ra nhiều hơn số còn lại.
 */
export function secureRng(): Rng {
  const buffer = new Uint32Array(1)
  return (bound) => {
    const limit = Math.floor(0x1_0000_0000 / bound) * bound
    for (;;) {
      crypto.getRandomValues(buffer)
      if (buffer[0] < limit) return buffer[0] % bound
    }
  }
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*-_=+?'
/** Ký tự dễ đọc nhầm khi chép tay hoặc đọc qua điện thoại. */
const LOOKALIKE = /[0Oo1lI]/g

export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** Bỏ 0 O o 1 l I. */
  plain: boolean
}

export const PASSWORD_LENGTH = { min: 8, max: 64 } as const

export const DEFAULT_PASSWORD: PasswordOptions = { length: 16, lower: true, upper: true, digits: true, symbols: false, plain: false }

/** Các nhóm ký tự đang bật, mỗi nhóm một chuỗi. */
export function passwordClasses(options: PasswordOptions): string[] {
  const classes = [options.lower ? LOWER : '', options.upper ? UPPER : '', options.digits ? DIGITS : '', options.symbols ? SYMBOLS : '']
  return classes.map((chars) => (options.plain ? chars.replace(LOOKALIKE, '') : chars)).filter(Boolean)
}

function pick(chars: string, rng: Rng): string {
  return chars[rng(chars.length)]
}

/**
 * Mật khẩu có ÍT NHẤT một ký tự của mỗi nhóm đang bật (nhiều trang bắt buộc
 * vậy), phần còn lại rút từ cả bộ, rồi xáo vị trí để ký tự bắt buộc không luôn
 * đứng đầu. Không bật nhóm nào thì trả chuỗi rỗng.
 */
export function generatePassword(options: PasswordOptions, rng: Rng): string {
  const classes = passwordClasses(options)
  if (classes.length === 0) return ''
  const pool = classes.join('')
  const chars = classes.slice(0, options.length).map((group) => pick(group, rng))
  while (chars.length < options.length) chars.push(pick(pool, rng))
  // Fisher–Yates.
  for (let index = chars.length - 1; index > 0; index--) {
    const other = rng(index + 1)
    ;[chars[index], chars[other]] = [chars[other], chars[index]]
  }
  return chars.join('')
}

export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'excellent'

/** Số bit entropy = độ dài × log2(số ký tự có thể ra). */
export function passwordBits(options: PasswordOptions): number {
  const pool = passwordClasses(options).join('').length
  return pool === 0 ? 0 : options.length * Math.log2(pool)
}

export function passwordStrength(bits: number): PasswordStrength {
  return bits < 50 ? 'weak' : bits < 70 ? 'fair' : bits < 100 ? 'strong' : 'excellent'
}

export type CodeCharset = 'digits' | 'alnum'

export interface CodeOptions {
  /** Đứng trước phần ngẫu nhiên, ghi nguyên văn: "PX-". */
  prefix: string
  length: number
  charset: CodeCharset
}

export const CODE_LENGTH = { min: 4, max: 16 } as const
export const CODE_PREFIX_MAX = 12

export const DEFAULT_CODE: CodeOptions = { prefix: '', length: 8, charset: 'alnum' }

/** Mã đơn / mã phiếu được đọc qua điện thoại, chép tay: chữ HOA + số, không có I O 0 1. */
const CODE_CHARS: Record<CodeCharset, string> = {
  digits: DIGITS,
  alnum: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
}

export function generateCode(options: CodeOptions, rng: Rng): string {
  const chars = CODE_CHARS[options.charset]
  let body = ''
  for (let index = 0; index < options.length; index++) body += pick(chars, rng)
  return `${options.prefix}${body}`
}

/**
 * Một lô `count` chuỗi KHÔNG TRÙNG nhau. Màn hình giới hạn ở 100 mã ≥ 4 ký tự
 * (ít nhất 10.000 mã khác nhau) nên luôn đủ; trần số lần rút chỉ để một cấu hình
 * sai về sau không thành vòng lặp vô tận.
 */
export function generateBatch(count: number, make: () => string): string[] {
  const seen = new Set<string>()
  for (let attempt = 0; attempt < count * 20 && seen.size < count; attempt++) {
    const value = make()
    if (value) seen.add(value)
  }
  return Array.from(seen)
}
