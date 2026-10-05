import { useId } from 'react'
import { Form } from 'react-bootstrap'
import type { PdfOutput } from '../types/doc-tools.types'
import type { Compression } from '../utils/compression'
import type { MarkupOutput } from '../utils/markup-annotation'

const COMPRESSION_OPTIONS: { value: Compression; label: string }[] = [
  { value: 'none', label: 'Giữ nguyên' },
  { value: 'medium', label: 'Vừa' },
  { value: 'strong', label: 'Mạnh' },
]

const MARKUP_OPTIONS: { value: MarkupOutput; label: string }[] = [
  { value: 'flat', label: 'In phẳng' },
  { value: 'annotations', label: 'Sửa được' },
]

interface PdfOutputFieldsProps {
  value: PdfOutput
  /** Chỉ hỏi cách ghi dấu khi tài liệu có dấu. */
  hasMarkups: boolean
  disabled: boolean
  onChange: (value: PdfOutput) => void
}

/** Nén ảnh + cách ghi dấu tay — áp cho cả "Tải PDF" lẫn "Tách". */
export function PdfOutputFields({ value, hasMarkups, disabled, onChange }: PdfOutputFieldsProps) {
  const ids = useId()

  return (
    <fieldset className="erp-doc-export__options">
      <legend className="erp-doc-export__label">Tệp PDF</legend>
      <Form.Group controlId={`${ids}-compression`}>
        <Form.Label className="erp-doc-export__sublabel">Nén ảnh</Form.Label>
        <Form.Select
          value={value.compression}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, compression: event.target.value as Compression })}
        >
          {COMPRESSION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      {hasMarkups ? (
        <Form.Group controlId={`${ids}-markups`}>
          <Form.Label className="erp-doc-export__sublabel">Dấu tay</Form.Label>
          <Form.Select
            value={value.markupOutput}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, markupOutput: event.target.value as MarkupOutput })}
          >
            {MARKUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      ) : null}
      {hasMarkups && value.markupOutput === 'annotations' ? (
        <Form.Text className="erp-doc-export__hint">Mở bằng Acrobat/Foxit sửa, xoá được từng dấu. Chữ đã sửa và vùng xoá thật vẫn in phẳng.</Form.Text>
      ) : null}
    </fieldset>
  )
}
