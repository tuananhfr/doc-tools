export interface GroupPerson {
  id: string
  name: string
}

/** Khoá so trùng tên: bỏ hoa/thường và khác biệt Unicode tổ hợp ("Bình" gõ hai kiểu). */
const nameKey = (name: string) => name.normalize('NFC').toLocaleLowerCase('vi')

/**
 * Ghép lại danh sách người sau mỗi lần sửa ô "mỗi người một dòng" mà GIỮ id.
 * Khoản chi gắn người trả / người chia theo id, nên đổi "An" thành "Anh" không
 * được làm rơi họ khỏi khoản chi. Tên khớp nguyên văn giữ id cũ; dòng còn lại
 * nhận id của người cũ chưa ai nhận theo thứ tự (mỗi phím gõ chỉ sửa một dòng,
 * nên đó chính là dòng bị đổi tên); thừa ra mới là người mới.
 * Dòng trống vẫn giữ chỗ: xoá hết tên rồi gõ lại không biến thành người mới.
 */
export function reconcilePeople(previous: GroupPerson[], lines: string[], makeId: () => string): GroupPerson[] {
  const names = lines.map((line) => line.trim())
  const claimed = new Set<string>()
  const ids: (string | null)[] = names.map((name) => {
    if (!name) return null
    const same = previous.find((person) => !claimed.has(person.id) && person.name === name)
    if (!same) return null
    claimed.add(same.id)
    return same.id
  })
  const free = previous.filter((person) => !claimed.has(person.id))
  return names.map((name, index) => ({ id: ids[index] ?? free.shift()?.id ?? makeId(), name }))
}

/** Người có tên (dòng trống không phải một người). */
export const namedPeople = (people: GroupPerson[]) => people.filter((person) => person.name !== '')

/** Các tên xuất hiện từ hai lần trở lên, giữ cách viết của lần đầu. */
export function duplicateNames(people: GroupPerson[]): string[] {
  const seen = new Map<string, number>()
  const first = new Map<string, string>()
  for (const { name } of namedPeople(people)) {
    const key = nameKey(name)
    seen.set(key, (seen.get(key) ?? 0) + 1)
    if (!first.has(key)) first.set(key, name)
  }
  return [...seen].filter(([, total]) => total > 1).map(([key]) => first.get(key) ?? key)
}

/**
 * Người được thêm SAU khi khoản chi đã tạo và chưa được tích vào khoản đó —
 * khoản cũ không tự chia cho người mới, phải nhắc để người dùng tự quyết.
 */
export function addedLater(people: GroupPerson[], knownIds: string[], participants: string[]): GroupPerson[] {
  return namedPeople(people).filter((person) => !knownIds.includes(person.id) && !participants.includes(person.id))
}
