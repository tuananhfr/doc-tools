import { useId } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { ImageSheet, Paper } from '../types/doc-tools.types'
import { SHEET_MARGINS, sheetOf } from '../utils/image-sheet'

// `label: null` = nhãn cần dịch (sheet.fit); tên khổ giấy giữ nguyên mọi ngôn ngữ.
const PAPER_OPTIONS: { value: Paper; label: string | null }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'a3', label: 'A3' },
  { value: 'letter', label: 'Letter' },
  { value: 'fit', label: null },
]

interface ImageSheetFieldsProps {
  sheet: ImageSheet | undefined
  disabled: boolean
  onChange: (sheet: ImageSheet) => void
}

/** Khổ giấy + lề cho MỌI trang ảnh — đổi là xem trước, ảnh thu nhỏ và tệp xuất đổi theo. */
export function ImageSheetFields({ sheet, disabled, onChange }: ImageSheetFieldsProps) {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const current = sheetOf(sheet)

  return (
    <fieldset className="erp-doc-export__sheet">
      <legend className="erp-doc-export__label">{t('sheet.legend')}</legend>
      <Form.Group controlId={`${ids}-paper`}>
        <Form.Label className="erp-doc-export__sublabel">{t('sheet.paper')}</Form.Label>
        <Form.Select
          value={current.paper}
          disabled={disabled}
          onChange={(event) => onChange({ ...current, paper: event.target.value as Paper })}
        >
          {PAPER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? t('sheet.fit')}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group controlId={`${ids}-margin`}>
        <Form.Label className="erp-doc-export__sublabel">{t('sheet.margin')}</Form.Label>
        <Form.Select
          value={current.margin}
          disabled={disabled}
          onChange={(event) => onChange({ ...current, margin: Number(event.target.value) })}
        >
          {SHEET_MARGINS.map((margin) => (
            <option key={margin} value={margin}>
              {margin === 0 ? t('sheet.noMargin') : `${margin} mm`}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    </fieldset>
  )
}
