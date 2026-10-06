import { searchKey } from '@/utils/vn-normalize'

export interface AddressMapping { oldProvince: string; oldDistrict: string; oldWard: string; newProvince: string; newWard: string }
/** Một tỉnh/thành mới và các tỉnh cũ nhập vào nó. */
export interface ProvinceMerge { name: string; old: string[] }
/** Dữ liệu gói `addresses`: cần ít nhất một trong hai; tỉnh thiếu trong `provinces` thì suy ra từ `wards`. */
export interface AddressRules { provinces: ProvinceMerge[]; wards: AddressMapping[] }

export type AddressStatus = 'full' | 'province' | 'ambiguous' | 'none'
export interface AddressResult { input: string; output: string; status: AddressStatus; options: string[]; droppedDistrict: string }

interface ProvinceEntry { key: string; old: string; name: string }
export interface AddressIndex { provinces: Map<string, ProvinceEntry>; wards: Map<string, AddressMapping[]> }

const WARD_FIELDS = ['oldProvince', 'oldDistrict', 'oldWard', 'newProvince', 'newWard'] as const

// searchKey giữ dấu câu nên "P.Dịch Vọng", "Q.1", "Bà Rịa - Vũng Tàu" phải tách thêm ở đây.
const norm = (value: string) => searchKey(value).replace(/[.\-_/]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(phuong|quan|p|q)(\d)/, '$1 $2')

const PROVINCE_PREFIX = /^(tinh|thanh pho|tp|t p)\s+/
// Dài trước ngắn: "thi xa" phải thắng "x", "thanh pho" phải thắng "tp".
const UNIT_PREFIX = /^(thi tran|thi xa|thanh pho|phuong|quan|huyen|xa|tt|tx|tp|p|x|q|h)\s+/
const WARD_PREFIX = /^(thi tran|phuong|xa|tt|p|x)\s/
const DISTRICT_PREFIX = /^(quan|huyen|thi xa|tx|q|h)\s/
const CITY_PREFIX = /^(thanh pho|tp)\s/

/** Cách viết tắt quen dùng — chỉ là chính tả, tên tỉnh vẫn phải có trong gói dữ liệu mới nhận ra. */
const PROVINCE_ALIASES: Record<string, string[]> = {
  hcm: ['ho chi minh'], tphcm: ['ho chi minh'], 'sai gon': ['ho chi minh'],
  'br vt': ['ba ria vung tau'], brvt: ['ba ria vung tau'], 'vung tau': ['ba ria vung tau'],
  hn: ['ha noi'], 'tt hue': ['thua thien hue', 'hue'], 'thua thien hue': ['hue'], hue: ['thua thien hue'],
  'dac lac': ['dak lak'], 'dac nong': ['dak nong'],
}

const provinceKey = (value: string) => norm(value).replace(PROVINCE_PREFIX, '')
// "Phường 01" và "P.1" là một: bỏ loại đơn vị và số 0 đứng đầu.
const unitKey = (value: string) => norm(value).replace(UNIT_PREFIX, '').replace(/^0+(\d)/, '$1')
const wardRowKey = (row: AddressMapping) => WARD_FIELDS.map((field) => norm(row[field])).join('|')

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value.length <= 150

/** Kiểm và làm sạch dữ liệu gói hoặc bảng tự nhập: một xã cũ tách sang nhiều xã mới là hợp lệ; dòng trùng y hệt bị bỏ. */
export function parseAddressRules(data: unknown): AddressRules | null {
  if (!data || typeof data !== 'object') return null
  const { provinces = [], wards = [] } = data as Record<string, unknown>
  if (!Array.isArray(provinces) || !Array.isArray(wards) || provinces.length > 200 || wards.length > 100_000) return null
  if (!provinces.length && !wards.length) return null
  const targetOf = new Map<string, string>()
  // Một tỉnh cũ chỉ nhập vào một tỉnh mới; hai đích là dữ liệu sai chứ không phải "tách".
  const claim = (old: string, name: string) => {
    const current = targetOf.get(provinceKey(old))
    targetOf.set(provinceKey(old), provinceKey(name))
    return current === undefined || current === provinceKey(name)
  }
  const merges: ProvinceMerge[] = []
  for (const item of provinces) {
    if (!item || typeof item !== 'object') return null
    const { name, old } = item as Record<string, unknown>
    if (!isText(name) || !Array.isArray(old) || !old.length || old.length > 20 || !old.every(isText)) return null
    if (!old.every((value) => claim(value, name))) return null
    merges.push({ name: name.trim(), old: old.map((value) => value.trim()) })
  }
  const seen = new Set<string>()
  const rows: AddressMapping[] = []
  for (const item of wards) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    if (WARD_FIELDS.some((field) => !isText(row[field]))) return null
    const mapping = Object.fromEntries(WARD_FIELDS.map((field) => [field, (row[field] as string).trim()])) as unknown as AddressMapping
    if (!claim(mapping.oldProvince, mapping.newProvince)) return null
    const key = wardRowKey(mapping)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(mapping)
  }
  return { provinces: merges, wards: rows }
}

/** Bảng tự nhập, mỗi dòng "tỉnh cũ|huyện cũ|xã cũ|tỉnh mới|xã mới". Ô trống = bảng rỗng, không phải lỗi. */
export function parseAddressMappings(text: string): AddressRules | null {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return { provinces: [], wards: [] }
  const rows = lines.map((line) => line.split('|').map((part) => part.trim()))
  if (rows.some((parts) => parts.length !== 5)) return null
  return parseAddressRules({ wards: rows.map(([oldProvince, oldDistrict, oldWard, newProvince, newWard]) => ({ oldProvince, oldDistrict, oldWard, newProvince, newWard })) })
}

export function indexAddressRules(rules: AddressRules): AddressIndex {
  const provinces = new Map<string, ProvinceEntry>()
  for (const merge of rules.provinces) for (const old of merge.old) provinces.set(provinceKey(old), { key: provinceKey(old), old, name: merge.name })
  const wards = new Map<string, AddressMapping[]>()
  for (const row of rules.wards) {
    const key = provinceKey(row.oldProvince)
    if (!provinces.has(key)) provinces.set(key, { key, old: row.oldProvince, name: row.newProvince })
    const wardKey = `${key}|${unitKey(row.oldWard)}`
    const list = wards.get(wardKey)
    if (list) list.push(row)
    else wards.set(wardKey, [row])
  }
  return { provinces, wards }
}

function findProvince(part: string, index: AddressIndex): ProvinceEntry | null {
  const key = provinceKey(part)
  for (const candidate of [key, ...(PROVINCE_ALIASES[key] ?? [])]) {
    const entry = index.provinces.get(candidate)
    if (entry) return entry
  }
  return null
}

const distinctTargets = (rows: AddressMapping[]) => [...new Map(rows.map((row) => [`${norm(row.newProvince)}|${norm(row.newWard)}`, row])).values()]

/** Bản port `convertAddress` của Chuyện Nhỏ gốc: tìm tỉnh ở bất kỳ đoạn nào (quét từ cuối), bỏ cấp huyện, chỉ đổi xã khi dữ liệu chỉ ra đúng một đích. */
export function convertAddress(input: string, index: AddressIndex): AddressResult {
  const parts = input.split(',').map((part) => part.trim()).filter(Boolean)
  let provinceAt = -1
  let province: ProvinceEntry | null = null
  for (let at = parts.length - 1; at >= 0 && !province; at--) {
    province = findProvince(parts[at], index)
    if (province) provinceAt = at
  }
  if (!province) return { input, output: input, status: 'none', options: [], droppedDistrict: '' }
  const before = parts.slice(0, provinceAt)
  const after = parts.slice(provinceAt + 1)
  const last = before.length - 1
  const isDistrict = (part: string) => DISTRICT_PREFIX.test(norm(part)) || (CITY_PREFIX.test(norm(part)) && before.length > 2)
  let districtAt = last >= 0 && isDistrict(before[last]) ? last : -1
  let wardAt = before.findIndex((part, at) => at !== districtAt && WARD_PREFIX.test(norm(part)))
  // Không có tiền tố thì đoán theo vị trí "…, xã, huyện, tỉnh"; một đoạn trơ trọi coi là số nhà/đường, không đoán.
  if (wardAt < 0 && before.length >= 2) wardAt = last - 1
  if (districtAt < 0 && wardAt >= 0 && wardAt === last - 1) districtAt = last
  const ward = wardAt >= 0 ? before[wardAt] : ''
  const district = districtAt >= 0 ? before[districtAt] : ''
  const rest = before.filter((_part, at) => at !== wardAt && at !== districtAt)
  const finish = (status: AddressStatus, wardText: string, provinceName: string, options: string[] = []): AddressResult =>
    ({ input, output: [...rest, ...(wardText ? [wardText] : []), provinceName, ...after].join(', '), status, options, droppedDistrict: district })
  if (!ward) return finish('province', '', province.name)
  const candidates = index.wards.get(`${province.key}|${unitKey(ward)}`) ?? []
  let hits = district ? candidates.filter((row) => unitKey(row.oldDistrict) === unitKey(district)) : candidates
  // Xã và phường trùng tên trong một tỉnh: loại đơn vị người dùng viết ra là manh mối còn lại.
  if (distinctTargets(hits).length > 1) {
    const sameType = hits.filter((row) => norm(row.oldWard) === norm(ward))
    if (sameType.length) hits = sameType
  }
  const targets = distinctTargets(hits)
  if (targets.length === 1) return finish('full', targets[0].newWard, targets[0].newProvince)
  if (targets.length > 1) return finish('ambiguous', ward, province.name, targets.map((row) => row.newWard))
  return finish('province', ward, province.name)
}
