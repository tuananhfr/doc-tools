import { Icon } from '@/components/ui'

export interface ToolSegment<T extends string> {
  value: T
  label: string
  icon?: string
}

interface ToolSegmentsProps<T extends string> {
  /** Tên nhóm cho trình đọc màn hình ("Loại đơn vị"). */
  label: string
  value: T
  options: ToolSegment<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}

/** Dải nút chọn một trong vài chế độ của công cụ; thẻ đang chọn nổi nền, không chỉ đổi màu chữ. */
export function ToolSegments<T extends string>({ label, value, options, onChange, disabled }: ToolSegmentsProps<T>) {
  return (
    <div className="erp-tool-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`btn erp-tool-tab${value === option.value ? ' is-active' : ''}`}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <Icon name={option.icon} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  )
}
