import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { CopyButton } from '@/features/tools/hub'
import type { Rgb } from '../utils/color'

interface ColorCodeFieldProps {
  label: string
  /** Mã của màu hiện tại ở dạng này ("#DA3548", "rgb(218, 53, 72)"). */
  code: string
  /** Đọc chữ người dùng gõ; null = chưa phải một mã màu. */
  parse: (text: string) => Rgb | null
  onColor: (color: Rgb) => void
}

/**
 * Ô mã màu sửa được. Trong lúc gõ ô giữ CHỮ ĐANG GÕ chứ không dựng lại từ màu:
 * "#DA3" đã là một màu hợp lệ, dựng lại thành "#DDAA33" là chèn chữ vào giữa tay
 * người đang gõ. Rời ô mới quay về mã chuẩn.
 */
export function ColorCodeField({ label, code, parse, onColor }: ColorCodeFieldProps) {
  const { t } = useTranslation('utility')
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="erp-flow-field">
      <label className="erp-flow-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="erp-color-code">
        <Form.Control
          id={id}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="erp-tool-number"
          value={draft ?? code}
          isInvalid={draft !== null && parse(draft) === null}
          onChange={(event) => {
            setDraft(event.target.value)
            const color = parse(event.target.value)
            if (color) onColor(color)
          }}
          onBlur={() => setDraft(null)}
        />
        <CopyButton text={code} label={t('color.copyCode', { label })} iconOnly />
      </div>
    </div>
  )
}
