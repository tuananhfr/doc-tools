/**
 * Chép chữ vào bộ nhớ tạm. `navigator.clipboard` chỉ có ở ngữ cảnh an toàn
 * (HTTPS / localhost): mở app bằng `http://<IP LAN>` để thử trên điện thoại thì
 * nó là `undefined`, nên có đường lui bằng `execCommand('copy')`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Bị chặn quyền hoặc tab không có focus: thử đường lui bên dưới.
  }

  const area = document.createElement('textarea')
  area.value = text
  area.readOnly = true
  area.className = 'visually-hidden'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}
