import { useId, type ReactNode } from 'react'

export interface TemplateOption<T extends string> {
  id: T
  label: string
  /** Bản thu nhỏ dựng bằng CHÍNH renderer xem trước của công cụ; null = chưa dựng xong / lỗi → chỉ hiện tên. */
  preview: ReactNode | null
}

/**
 * Chọn mẫu bằng thumbnail có tên (spec v3 §04 Template). Mỗi mẫu là một nút `aria-pressed` nên bàn phím
 * và trình đọc màn hình dùng được như nút thường; thumbnail chỉ để nhìn (`aria-hidden` + `inert`).
 * Trên mobile danh sách cuộn ngang (CSS `template-picker.css`).
 */
export function TemplatePicker<T extends string>({ label, items, value, onChange }: { label: string; items: readonly TemplateOption<T>[]; value: T; onChange: (id: T) => void }) {
  const id = useId()
  return (
    <div className="cn-template-picker" role="group" aria-labelledby={`${id}-label`}>
      <span className="cn-template-picker__title" id={`${id}-label`}>{label}</span>
      <div className="cn-template-picker__list">
        {items.map(item => (
          <button type="button" key={item.id} className="cn-template-picker__item" aria-pressed={item.id === value} onClick={() => { if (item.id !== value) onChange(item.id) }}>
            <span className="cn-template-picker__thumb" aria-hidden="true" inert>{item.preview}</span>
            <span className="cn-template-picker__name">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
