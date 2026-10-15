import { useId } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { numberFormat } from '@/i18n/intl'
import { READ_TEXT_MAX_CHARS } from '../config/read-listen'
import type { ReadFontScale } from '../types/read-listen.types'
import { ReadErrorNotice } from './ReadErrorNotice'

interface ReadPastePanelProps {
  value: string
  onChange: (value: string) => void
  fontScale: ReadFontScale
}

const formatCount = (value: number) => numberFormat().format(value)

/** Thẻ "Dán chữ". Chữ nằm ở state của trang và thẻ chỉ bị ẩn khi sang thẻ khác, nên quay lại vẫn còn nguyên. */
export function ReadPastePanel({ value, onChange, fontScale }: ReadPastePanelProps) {
  const { t } = useTranslation('accessibility')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.read' })
  const textId = useId()
  const counterId = useId()
  return <>
    <label className="erp-flow-field__label mt-3" htmlFor={textId}>{t('readAloud.content')}</label>
    <Form.Control id={textId} as="textarea" rows={7} value={value} placeholder={studio('placeholder')} className={`erp-read-text--${fontScale}`} aria-describedby={counterId} onChange={(event) => onChange(event.target.value)} />
    <p id={counterId} className="erp-tool-result__note mt-1">{t('readAloud.counter', { used: formatCount(value.length), max: formatCount(READ_TEXT_MAX_CHARS) })}</p>
    {value.length > READ_TEXT_MAX_CHARS ? <ReadErrorNotice code="TOO_LARGE" tone="alert" /> : null}
  </>
}
