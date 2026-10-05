/** Tên tệp bỏ đuôi (`.jpg`, `.jpeg`, `.webp`, `.pdf`…). */
export function stem(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '')
}

/**
 * Tên chưa có trong `used` (rồi ghi nó vào): `a.pdf` → `a (2).pdf`. So KHÔNG
 * phân biệt hoa thường vì Windows và macOS coi `A.jpg` với `a.jpg` là một —
 * hai tệp đó trong cùng một .zip thì giải nén ra tệp sau đè tệp trước.
 */
export function uniqueName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.')
  let unique = name
  for (let n = 2; used.has(unique.toLowerCase()); n++) {
    unique = dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`
  }
  used.add(unique.toLowerCase())
  return unique
}

/** `a.png` và `a.jpg` cùng đổi sang WebP là hai tệp `a.webp`: đánh số cả lô trước khi gói. */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => uniqueName(name, used))
}
