const TONED: Record<string, string> = {
  a: 'áàảãạ', â: 'ấầẩẫậ', ă: 'ắằẳẵặ', e: 'éèẻẽẹ', ê: 'ếềểễệ', i: 'íìỉĩị',
  o: 'óòỏõọ', ô: 'ốồổỗộ', ơ: 'ớờởỡợ', u: 'úùủũụ', ư: 'ứừửữự', y: 'ýỳỷỹỵ',
}

const TCVN_TONED: Record<string, string> = {
  a: '¸µ¶·¹', ă: '¾»¼½Æ', â: 'ÊÇÈÉË', e: 'ÐÌÎÏÑ', ê: 'ÕÒÓÔÖ', i: 'Ý×ØÜÞ',
  o: 'ãßáâä', ô: 'èåæçé', ơ: 'íêëìî', u: 'óïñòô', ư: 'øõö÷ù', y: 'ýúûüþ',
}

const TCVN_BASE: Record<string, string> = {
  '¨': 'ă', '©': 'â', 'ª': 'ê', '«': 'ô', '¬': 'ơ', '\u00ad': 'ư', '®': 'đ',
  '¡': 'Ă', '¢': 'Â', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư', '§': 'Đ',
}

const TCVN_MAP: Record<string, string> = { ...TCVN_BASE }
for (const [base, glyphs] of Object.entries(TCVN_TONED)) {
  for (let index = 0; index < glyphs.length; index += 1) TCVN_MAP[glyphs[index]] = TONED[base][index]
}

export function tcvn3ToUnicode(input: string, uppercase = false): string {
  return [...input].map((char) => {
    const mapped = TCVN_MAP[char]
    return mapped ? uppercase ? mapped.toUpperCase() : mapped : char
  }).join('').normalize('NFC')
}

const VNI_PAIRS: [string, string][] = []
const addVni = (unicode: string, encoded: string) => {
  VNI_PAIRS.push([encoded, unicode], [encoded.toUpperCase(), unicode.toUpperCase()])
}
const VNI_TONES = ['ù', 'ø', 'û', 'õ', 'ï']
const VNI_ROUND = ['á', 'à', 'å', 'ã', 'ä']
const VNI_BREVE = ['é', 'è', 'ú', 'ü', 'ë']
for (const base of ['a', 'e', 'o', 'u']) {
  for (let index = 0; index < 5; index += 1) addVni(TONED[base][index], base + VNI_TONES[index])
}
for (let index = 0; index < 5; index += 1) addVni(TONED.y[index], index === 4 ? 'î' : 'y' + VNI_TONES[index])
;['í', 'ì', 'æ', 'ó', 'ò'].forEach((encoded, index) => addVni(TONED.i[index], encoded))
for (const [base, rounded] of [['a', 'â'], ['e', 'ê'], ['o', 'ô']]) {
  addVni(rounded, base + 'â')
  for (let index = 0; index < 5; index += 1) addVni(TONED[rounded][index], base + VNI_ROUND[index])
}
addVni('ă', 'aê')
for (let index = 0; index < 5; index += 1) addVni(TONED.ă[index], 'a' + VNI_BREVE[index])
addVni('ơ', 'ô')
for (let index = 0; index < 5; index += 1) addVni(TONED.ơ[index], 'ô' + VNI_TONES[index])
addVni('ư', 'ö')
for (let index = 0; index < 5; index += 1) addVni(TONED.ư[index], 'ö' + VNI_TONES[index])
addVni('đ', 'ñ')
VNI_PAIRS.sort((a, b) => b[0].length - a[0].length)
const VNI_MAP = new Map(VNI_PAIRS)
const VNI_PATTERN = new RegExp(VNI_PAIRS.map(([encoded]) => encoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')

export function vniToUnicode(input: string): string {
  return input.replace(VNI_PATTERN, (matched) => VNI_MAP.get(matched) ?? matched).normalize('NFC')
}

export function removeVietnameseMarks(input: string): string {
  return input.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC')
}

// Chữ chỉ có trong tiếng Việt Unicode (ă đ ĩ ũ ơ ư + khối U+1EA0–1EF9) hoặc dấu tổ hợp. TCVN3/VNI chỉ dùng
// ký tự ≤ U+00FF nên văn bản mã cũ không bao giờ chứa chúng; chuyển nhầm văn bản Unicode là hỏng dấu.
const UNICODE_VIETNAMESE = /[ĂăĐđĨĩŨũƠơƯưẠ-ỹ̀-̣̃̉]/u

export function isUnicodeVietnamese(input: string): boolean {
  return UNICODE_VIETNAMESE.test(input)
}
