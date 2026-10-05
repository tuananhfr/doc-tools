export const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

/**
 * Mở hộp chọn tệp từ một nút bất kỳ (Chèn trước/sau, Thay trang…). Input phải
 * nằm trong DOM: iOS Safari bỏ qua `click()` trên input tách rời.
 */
export function pickFiles(multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPT
    input.multiple = multiple
    input.hidden = true

    const finish = (files: File[]) => {
      input.remove()
      resolve(files)
    }
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])), { once: true })
    input.addEventListener('cancel', () => finish([]), { once: true })

    document.body.appendChild(input)
    input.click()
  })
}
