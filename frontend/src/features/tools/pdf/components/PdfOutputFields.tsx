import { useId } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { PdfOutput } from '../types/doc-tools.types'
import type { Compression } from '../utils/compression'
import type { MarkupOutput } from '../utils/markup-annotation'

const COMPRESSION_OPTIONS = [
  { value: 'none', label: 'output.compressionNone' },
  { value: 'medium', label: 'compress.level.medium' },
  { value: 'strong', label: 'compress.level.strong' },
] as const satisfies readonly { value: Compression; label: string }[]

const MARKUP_OPTIONS = [
  { value: 'flat', label: 'output.markupFlat' },
  { value: 'annotations', label: 'output.markupAnnotations' },
] as const satisfies readonly { value: MarkupOutput; label: string }[]

interface PdfOutputFieldsProps {
  value: PdfOutput
  /** Chỉ hỏi cách ghi dấu khi tài liệu có dấu. */
  hasMarkups: boolean
  disabled: boolean
  onChange: (value: PdfOutput) => void
}

/** Nén ảnh + cách ghi dấu tay — áp cho cả "Tải PDF" lẫn "Tách". */
export function PdfOutputFields({ value, hasMarkups, disabled, onChange }: PdfOutputFieldsProps) {
  const { t } = useTranslation('pdf')
  const ids = useId()

  return (
    <fieldset className="erp-doc-export__options">
      <legend className="erp-doc-export__label">{t('output.legend')}</legend>
      <Form.Group controlId={`${ids}-compression`}>
        <Form.Label className="erp-doc-export__sublabel">{t('output.compression')}</Form.Label>
        <Form.Select
          value={value.compression}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, compression: event.target.value as Compression })}
        >
          {COMPRESSION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      {hasMarkups ? (
        <Form.Group controlId={`${ids}-markups`}>
          <Form.Label className="erp-doc-export__sublabel">{t('output.markups')}</Form.Label>
          <Form.Select
            value={value.markupOutput}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, markupOutput: event.target.value as MarkupOutput })}
          >
            {MARKUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      ) : null}
      {hasMarkups && value.markupOutput === 'annotations' ? (
        <Form.Text className="erp-doc-export__hint">{t('output.annotationsHint')}</Form.Text>
      ) : null}
    </fieldset>
  )
}
