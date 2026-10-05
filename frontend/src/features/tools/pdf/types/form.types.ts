/** Có form hay không — đọc rẻ lúc nạp tệp để biết có cần tab Điền form, chưa đọc từng trường. */
export interface FormSummary {
  /** Trường điền được (không tính ô chữ ký, nút bấm). */
  fields: number
  xfa: boolean
}

export type FormFieldKind = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'list'

/** Chữ: text, ô chọn: true/false, nhóm radio: giá trị chọn ('' = chưa chọn), danh sách: các mục chọn. */
export type FormValue = string | boolean | string[]

/** Giá trị theo tên đầy đủ của trường ("ho_so.so_hop_dong"). */
export type FormValues = Record<string, FormValue>

export interface FormField {
  name: string
  /** Tên hiển thị: /TU (tooltip người soạn form đặt) nếu có, không thì tên trường. */
  label: string
  kind: FormFieldKind
  value: FormValue
  /** Giá trị của radio / mục của danh sách. */
  options: string[]
  multiline: boolean
  maxLength?: number
  readOnly: boolean
  required: boolean
  /** Ô thả xuống cho gõ giá trị ngoài danh sách. */
  editable: boolean
  multiSelect: boolean
  /** Trang (đếm từ 0, theo tệp nguồn) có ô của trường này. */
  pages: number[]
}

export interface FormInfo {
  fields: FormField[]
  xfa: boolean
  /** Ô chữ ký đã ký — điền form là đổi tệp, chữ ký mất hiệu lực. */
  signed: number
  /** Ô chữ ký trống + nút bấm: có trong form nhưng không điền ở đây. */
  skipped: number
}
