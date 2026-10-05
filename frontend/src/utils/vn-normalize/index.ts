/**
 * Chuẩn hoá tiếng Việt và định danh — bản TypeScript của đặc tả
 * ERPCONS-DCP-017 (Data Control Plane v3.0, tài liệu 17).
 *
 * MỘT ĐẶC TẢ, HAI CÀI ĐẶT: bản PHP nằm ở module Drupal `erpcons_dcp_normalize`
 * (`VnNormalizer`). Hai bản đọc CHUNG `normalization_tables_v1.json` và chạy
 * CHUNG `normalization_vectors_v1.json`; cùng đầu vào mà khác đầu ra là lỗi
 * SEV2 theo đặc tả. Sửa luật ở đây thì sửa bên PHP trong cùng lượt, chạy cả
 * hai bộ kiểm, và tăng `NORMALIZATION_VERSION` nếu kết quả đổi.
 *
 * Ba luật của lớp này:
 *  - KHÔNG BAO GIỜ thay giá trị gốc — chỉ sinh giá trị chuẩn hoá song song;
 *  - tất định, không AI, không phụ thuộc locale của máy;
 *  - số liệu không hợp lệ thì GIỮ NGUYÊN và gắn cờ `valid: false`, không tự sửa.
 */
import tables from './normalization_tables_v1.json'

export const NORMALIZATION_VERSION: number = tables.normalization_version

/* ------------------------------------------------------------------ */
/* Văn bản                                                             */
/* ------------------------------------------------------------------ */

/**
 * Khoảng trắng — liệt kê TƯỜNG MINH thay vì `\s`: `\s` của JS và của PCRE
 * (PHP) không trùng nhau về khoảng trắng Unicode, và hai bản phải ra cùng kết
 * quả. Bên PHP khai đúng tập này.
 */
const WHITESPACE =
  /[\t\n\v\f\r \u0085\u{00a0}\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}]+/gu

/** Ký tự điều khiển C0/C1 trừ tab, xuống dòng (đã thuộc tập khoảng trắng). */
// eslint-disable-next-line no-control-regex -- bắt ký tự điều khiển là đúng mục đích của regex này
const CONTROL = /[\u0000-\u0008\u000e-\u001f\u007f-\u0084\u0086-\u009f]/gu

const INVISIBLE = new Set<string>(tables.invisible)
const HOMOGLYPHS: Record<string, string> = tables.homoglyphs

/** Dấu thanh (trừ ngang) trên a/e/y — để dời về nguyên âm đầu. */
const TONED_A: Record<string, string> = { à: 'ò', á: 'ó', ả: 'ỏ', ã: 'õ', ạ: 'ọ' }
const TONED_E: Record<string, string> = { è: 'ò', é: 'ó', ẻ: 'ỏ', ẽ: 'õ', ẹ: 'ọ' }
const TONED_Y: Record<string, string> = { ỳ: 'ù', ý: 'ú', ỷ: 'ủ', ỹ: 'ũ', ỵ: 'ụ' }

function stripInvisible(value: string): string {
  let out = ''
  for (const char of value.replace(CONTROL, '')) {
    if (!INVISIBLE.has(char)) out += char
  }
  return out
}

/** UTS #39 rút gọn: Cyrillic/Greek trông như Latin, và Latin toàn khổ (Ａ, ａ, ０). */
function mapHomoglyphs(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCodePoint(code - 0xfee0)
      continue
    }
    out += HOMOGLYPHS[char] ?? char
  }
  return out
}

/**
 * Vị trí dấu thanh về KIỂU MỚI (hòa, thủy, khỏe): với vần mở "oa", "oe", "uy"
 * dấu nằm ở nguyên âm ĐẦU. Vần có phụ âm cuối (hoàng, khoảng, thuyền) thì hai
 * kiểu giống nhau nên không đụng tới; "quý" giữ nguyên vì "qu" là phụ âm.
 * Chạy trên chuỗi ĐÃ chữ thường.
 */
function moveTones(value: string): string {
  return value
    .replace(/o([àáảãạ])(?!\p{L})/gu, (_m, toned: string) => `${TONED_A[toned]}a`)
    .replace(/o([èéẻẽẹ])(?!\p{L})/gu, (_m, toned: string) => `${TONED_E[toned]}e`)
    .replace(/(?<!q)u([ỳýỷỹỵ])(?!\p{L})/gu, (_m, toned: string) => `${TONED_Y[toned]}y`)
}

function collapseWhitespace(value: string): string {
  return value.replace(WHITESPACE, ' ').trim()
}

/**
 * Giá trị chuẩn hoá của văn bản (bước 1–5 của đặc tả): bỏ ký tự vô hình →
 * NFC → homoglyph → chữ thường → dấu thanh kiểu mới → gộp khoảng trắng.
 * Còn dấu tiếng Việt — dùng để so "cùng một chữ", không phải để tìm.
 */
export function normalizeText(value: unknown): string {
  const raw = String(value ?? '')
  const cleaned = mapHomoglyphs(stripInvisible(raw).normalize('NFC')).toLowerCase()
  return collapseWhitespace(moveTones(cleaned).normalize('NFC'))
}

/**
 * Bước 6: khoá tìm kiếm — `normalizeText` + bỏ dấu + đ→d.
 * "Đức Hòa" → "duc hoa". Đây là thứ hai chuỗi phải bằng nhau để coi là "gõ
 * không dấu vẫn khớp".
 */
export function searchKey(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/g, 'd')
    .normalize('NFC')
}

/**
 * Làm sạch TỪ KHOÁ trước khi gửi đi tìm: bỏ ký tự vô hình, NFC, homoglyph, gộp
 * khoảng trắng — KHÔNG đổi hoa thường, KHÔNG bỏ dấu (việc đó của chỉ mục).
 */
export function cleanQuery(value: unknown): string {
  return collapseWhitespace(mapHomoglyphs(stripInvisible(String(value ?? '')).normalize('NFC')))
}

/* ------------------------------------------------------------------ */
/* Pháp nhân                                                           */
/* ------------------------------------------------------------------ */

export type LegalForm = 'jsc' | 'llc' | 'partnership' | 'private' | 'coop' | 'household' | 'company'

export interface CompanyKey {
  /** Loại hình pháp nhân đọc được từ tên; `null` = tên không nói ra. */
  legalForm: LegalForm | null
  /** Phần tên riêng, đã bỏ loại hình — "abc" của "CTCP ABC". */
  core: string
  /** `legalForm|core` — hai tên cùng khoá là cùng pháp nhân theo tên. */
  key: string
}

/** Cụm từ của bảng, sắp DÀI trước để "cong ty tnhh" thắng "cong ty". */
const LEGAL_PHRASES = tables.legal_forms
  .flatMap((entry) => entry.aliases.map((alias) => ({ form: entry.form as LegalForm, words: alias.split(' ') })))
  .sort((a, b) => b.words.length - a.words.length)

const NOISE_PHRASES = tables.legal_form_noise
  .map((phrase) => phrase.split(' '))
  .sort((a, b) => b.length - a.length)

/** Thứ tự ưu tiên khi một tên mang nhiều cụm (thứ tự trong bảng). */
const FORM_RANK = new Map<string, number>(tables.legal_forms.map((entry, index) => [entry.form, index]))

function tokensOf(value: string): string[] {
  return searchKey(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function matchesAt(tokens: string[], start: number, words: string[]): boolean {
  if (start + words.length > tokens.length) return false
  return words.every((word, offset) => tokens[start + offset] === word)
}

/** Bước 7: tách loại hình pháp nhân khỏi tên (CTCP ↔ công ty cổ phần ↔ JSC…). */
export function companyKey(name: unknown): CompanyKey {
  const tokens = tokensOf(String(name ?? ''))
  const core: string[] = []
  let form: LegalForm | null = null

  for (let i = 0; i < tokens.length; ) {
    const phrase = LEGAL_PHRASES.find((candidate) => matchesAt(tokens, i, candidate.words))
    if (phrase) {
      if (form === null || (FORM_RANK.get(phrase.form) ?? 99) < (FORM_RANK.get(form) ?? 99)) {
        form = phrase.form
      }
      i += phrase.words.length
      continue
    }
    const noise = NOISE_PHRASES.find((words) => matchesAt(tokens, i, words))
    if (noise && form !== null) {
      i += noise.length
      continue
    }
    core.push(tokens[i])
    i += 1
  }

  const coreText = core.join(' ')
  return { legalForm: form, core: coreText, key: `${form ?? ''}|${coreText}` }
}

/* ------------------------------------------------------------------ */
/* Số điện thoại                                                       */
/* ------------------------------------------------------------------ */

export type PhoneKind = 'mobile' | 'landline' | 'international'

export interface PhoneResult {
  input: string
  /** Chuẩn E.164 (`+84xxxxxxxxx`); `null` khi không đọc được. */
  e164: string | null
  kind: PhoneKind | null
  valid: boolean
  /** Số cũ (11 số di động trước 2018 / mã vùng cũ trước 2017) đã được đổi. */
  legacy: boolean
  /** Dạng E.164 của số cũ — lưu làm alias, không phải số liên lạc. */
  aliases: string[]
}

const MOBILE_PREFIXES = new Set<string>(tables.mobile_prefixes)
const MOBILE_2018: Record<string, string> = tables.mobile_prefix_2018
const AREA_CODES = new Set<string>(tables.landline_area_codes)
const AREA_2017: Record<string, string> = tables.landline_area_2017

function isNewLandline(national: string): boolean {
  if (national.length !== 10 || national[0] !== '2') return false
  const two = national.slice(0, 2)
  // 024/028 + 8 số; thuê bao không bắt đầu bằng 0/1 — "0240…", "0281…" là mã vùng CŨ.
  if ((two === '24' || two === '28') && AREA_CODES.has(two)) return !/[01]/.test(national[2])
  return AREA_CODES.has(national.slice(0, 3))
}

/** Đọc số quốc gia (bỏ 0/84) theo luật hiện hành; trả số MỚI hoặc null. */
function classifyNational(national: string): { national: string; kind: PhoneKind; legacy: boolean } | null {
  if (national.length === 9 && MOBILE_PREFIXES.has(national.slice(0, 2))) {
    return { national, kind: 'mobile', legacy: false }
  }
  if (isNewLandline(national)) return { national, kind: 'landline', legacy: false }

  // Di động 11 số trước 2018: 01xx + 7 số.
  if (national.length === 10 && national[0] === '1') {
    const mapped = MOBILE_2018[national.slice(0, 3)]
    if (mapped) return { national: mapped + national.slice(3), kind: 'mobile', legacy: true }
    return null
  }

  // Mã vùng cố định cũ (trước 2017). Mã 1 chữ số (HN 4, HCM 8) đi kèm 8 số thuê
  // bao, mã 2–3 chữ số đi kèm 7 số. Thử mã DÀI trước.
  for (const size of [3, 2, 1]) {
    const code = national.slice(0, size)
    const mapped = AREA_2017[code]
    if (!mapped) continue
    const subscriber = national.slice(size)
    const expected = size === 1 ? 8 : 7
    if (subscriber.length !== expected || /^[01]/.test(subscriber)) continue
    return { national: mapped + subscriber, kind: 'landline', legacy: true }
  }
  return null
}

export function normalizePhone(value: unknown): PhoneResult {
  const input = String(value ?? '')
  const invalid: PhoneResult = { input, e164: null, kind: null, valid: false, legacy: false, aliases: [] }
  const compact = cleanQuery(input).replace(/[\s.\-()/]/g, '')
  if (!/^(\+|00)?\d+$/.test(compact)) return invalid

  let digits = compact
  let international = false
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
    international = true
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
    international = true
  }

  let national: string
  if (international) {
    if (!digits.startsWith('84')) {
      if (digits.length < 8 || digits.length > 15) return invalid
      return { input, e164: `+${digits}`, kind: 'international', valid: true, legacy: false, aliases: [] }
    }
    national = digits.slice(2).replace(/^0/, '')
  } else if (digits.startsWith('0')) {
    national = digits.slice(1)
  } else if (digits.startsWith('84') && (digits.length === 11 || digits.length === 12)) {
    national = digits.slice(2)
  } else {
    // Excel hay ăn mất số 0 đầu.
    national = digits
  }

  const result = classifyNational(national)
  if (!result) return invalid
  return {
    input,
    e164: `+84${result.national}`,
    kind: result.kind,
    valid: true,
    legacy: result.legacy,
    aliases: result.legacy ? [`+84${national}`] : [],
  }
}

/* ------------------------------------------------------------------ */
/* Mã số thuế, CCCD                                                    */
/* ------------------------------------------------------------------ */

export type TaxCodeKind = 'enterprise' | 'branch' | 'personal_id'

export interface TaxCodeResult {
  input: string
  /** Dạng chuẩn (`0101234567` · `0101234567-001` · 12 số); `null` khi sai định dạng. */
  canonical: string | null
  kind: TaxCodeKind | null
  /** Đúng định dạng VÀ (với MST 10 số) đúng chữ số kiểm tra. */
  valid: boolean
  /** Chữ số kiểm tra; `null` khi loại mã không có checksum. */
  checksumValid: boolean | null
  /** 10 số của trụ sở — dùng nối chi nhánh với trụ sở, KHÔNG phải để coi là trùng. */
  headOffice: string | null
}

const TAX_WEIGHTS = [31, 29, 23, 19, 17, 13, 7, 5, 3]

/** Chữ số thứ 10 của MST: 10 − (Σ trọng số mod 11); ra 10 là mã không hợp lệ. */
export function taxCodeChecksumValid(tenDigits: string): boolean {
  if (!/^\d{10}$/.test(tenDigits)) return false
  const sum = TAX_WEIGHTS.reduce((total, weight, index) => total + weight * Number(tenDigits[index]), 0)
  const check = 10 - (sum % 11)
  return check < 10 && check === Number(tenDigits[9])
}

export function normalizeTaxCode(value: unknown): TaxCodeResult {
  const input = String(value ?? '')
  const compact = cleanQuery(input).replace(/[\s.]/g, '')
  const empty: TaxCodeResult = { input, canonical: null, kind: null, valid: false, checksumValid: null, headOffice: null }

  if (/^\d{10}$/.test(compact)) {
    const ok = taxCodeChecksumValid(compact)
    return { input, canonical: compact, kind: 'enterprise', valid: ok, checksumValid: ok, headOffice: compact }
  }
  const branch = /^(\d{10})-?(\d{3})$/.exec(compact)
  if (branch) {
    const ok = taxCodeChecksumValid(branch[1]) && branch[2] !== '000'
    return {
      input,
      canonical: `${branch[1]}-${branch[2]}`,
      kind: 'branch',
      valid: ok,
      checksumValid: taxCodeChecksumValid(branch[1]),
      headOffice: branch[1],
    }
  }
  if (/^\d{12}$/.test(compact)) {
    const ok = personalIdValid(compact)
    return { input, canonical: compact, kind: 'personal_id', valid: ok, checksumValid: null, headOffice: null }
  }
  return empty
}

/** Số định danh cá nhân (CCCD) 12 số: 3 số đầu là mã tỉnh nơi đăng ký khai sinh (001–096). */
export function personalIdValid(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false
  const province = Number(value.slice(0, 3))
  return province >= 1 && province <= 96
}

/** Che số định danh khi hiện cho người không có quyền: chỉ chừa 4 số cuối. */
export function maskIdentifier(value: unknown): string {
  const text = String(value ?? '')
  if (text.length <= 4) return '*'.repeat(text.length)
  return '*'.repeat(text.length - 4) + text.slice(-4)
}

/* ------------------------------------------------------------------ */
/* Email, mã nghiệp vụ                                                 */
/* ------------------------------------------------------------------ */

export interface EmailResult {
  input: string
  email: string
  valid: boolean
  /** Hộp thư chung (ketoan@, info@…) — không dùng làm định danh một người. */
  generic: boolean
}

const GENERIC_MAILBOXES = new Set<string>(tables.generic_mailboxes)

/** Không bỏ dấu chấm / "+" — khác nhau theo nhà cung cấp, đặc tả cấm làm mặc định. */
export function normalizeEmail(value: unknown): EmailResult {
  const input = String(value ?? '')
  const email = cleanQuery(input).replace(/ /g, '').toLowerCase()
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const local = email.split('@')[0].split('+')[0]
  return { input, email, valid, generic: valid && GENERIC_MAILBOXES.has(local) }
}

/**
 * Mã nghiệp vụ: viết hoa, bỏ khoảng trắng; có `separator` thì mọi cụm ký tự
 * phân cách (`- _ . / \ |`) về đúng ký tự đó. Không truyền thì giữ ký tự phân
 * cách gốc, chỉ gộp các ký tự LẶP — "0088/2026/ĐX" không được thành "0088-2026-ĐX".
 */
export function normalizeBusinessCode(value: unknown, separator?: string): string {
  let code = cleanQuery(value).replace(/ /g, '').toUpperCase()
  if (separator !== undefined) {
    code = code.replace(/[-_./\\|]+/g, separator)
  } else {
    code = code.replace(/([-_./\\|])\1+/g, '$1')
  }
  return code.replace(/^[-_./\\|]+|[-_./\\|]+$/g, '')
}

/* ------------------------------------------------------------------ */
/* Vật tư, đơn vị                                                      */
/* ------------------------------------------------------------------ */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const DIAMETER = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${tables.diameter_markers.map(escapeRegExp).join('|')})\\s*(\\d+(?:[.,]\\d+)?)(?!\\d)`,
  'gu',
)
const STEEL_GRADE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${tables.steel_grade_prefixes.map(escapeRegExp).join('|')})\\s*-?\\s*(\\d{2,3})(?:\\s*-?\\s*([a-z])(?![\\p{L}\\p{N}]))?`,
  'gu',
)
/** "200 x 200 x 10" → "200x200x10" — nhìn trước số sau nên chuỗi nhiều chiều gộp trong một lượt. */
const DIMENSION = /(\d)\s*[x×*]\s*(?=\d)/gu

/**
 * Khoá so sánh của tên vật tư: `searchKey` + đường kính (Ø16, phi 16 → d16) +
 * mác thép (CB400 V, CB400-V → cb400v) + kích thước (200 x 200 → 200x200) +
 * thương hiệu theo bảng của tenant (`{ hp: 'hoa phat' }`).
 */
export function normalizeMaterial(value: unknown, brandAliases: Record<string, string> = {}): string {
  let key = searchKey(value)
    .replace(DIAMETER, (_m, size: string) => `d${size.replace(',', '.')}`)
    .replace(STEEL_GRADE, (_m, prefix: string, grade: string, suffix?: string) => `${prefix}${grade}${suffix ?? ''}`)
    .replace(DIMENSION, '$1x')

  const brands = Object.entries(brandAliases).map(([alias, brand]) => [searchKey(alias), searchKey(brand)] as const)
  if (brands.length > 0) {
    key = key
      .split(' ')
      .map((token) => brands.find(([alias]) => alias === token)?.[1] ?? token)
      .join(' ')
  }
  return collapseWhitespace(key)
}

export interface UnitResult {
  /** Mã đơn vị chuẩn (`m3`, `t`, `kg`…). */
  code: string
  /** Đơn vị gốc để quy đổi và hệ số: 1 tấn = 1000 kg. */
  base: string
  factor: number
}

const UNIT_ALIASES = new Map<string, UnitResult>()
for (const unit of tables.units) {
  for (const alias of unit.aliases) {
    UNIT_ALIASES.set(searchKey(alias).replace(/[\s.]/g, ''), { code: unit.code, base: unit.base, factor: unit.factor })
  }
}

/** Đơn vị tính: m3/m³/khối → m3; tấn/T/ton → t (= 1000 kg). Không nhận ra → `null`. */
export function normalizeUnit(value: unknown): UnitResult | null {
  const key = searchKey(value).replace(/[\s.]/g, '')
  return UNIT_ALIASES.get(key) ?? null
}
