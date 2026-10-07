import { useId } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { MARK_ANCHORS, type MarkAnchor, type MarkColor, type MarkState, type TextStamp } from '../types/mark.types'
import { MARK_COLORS } from '../utils/mark'

interface MarkOptionsProps {
  state: MarkState
  onChange: (change: (state: MarkState) => MarkState) => void
}

/** Giới hạn độ dài dấu: dòng dài hơn sẽ bị thu chữ tới mức không đọc được. */
const MAX_TEXT = 80

/** Cột tuỳ chọn của "Che & đóng dấu ảnh": dòng chữ đóng dấu và các khung che đã vẽ. */
export function MarkOptions({ state, onChange }: MarkOptionsProps) {
  const { t } = useTranslation('image')
  const ids = useId()
  const stamp = state.stamp
  const setStamp = (patch: Partial<TextStamp>) => onChange((current) => ({ ...current, stamp: { ...current.stamp, ...patch } }))
  const hasText = stamp.text.trim() !== ''

  return (
    <>
      <div className="erp-flow-field">
        <span className="erp-flow-field__label">{t('mark.boxesLabel')}</span>
        <p className="erp-flow-field__hint">
          {state.boxes.length > 0 ? t('mark.boxesSummary', { count: state.boxes.length }) : t('mark.boxesEmpty')}
        </p>
        <Button variant="link" size="sm" className="erp-image-reset" disabled={state.boxes.length === 0} onClick={() => onChange((current) => ({ ...current, boxes: [] }))}>
          <Icon name="x-circle" className="me-2" />
          {t('mark.clearBoxes')}
        </Button>
      </div>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-text`}>
          {t('mark.textLabel')}
        </label>
        <Form.Control id={`${ids}-text`} type="text" autoComplete="off" maxLength={MAX_TEXT} placeholder={t('mark.textPlaceholder')} value={stamp.text} onChange={(event) => setStamp({ text: event.target.value })} />
      </div>

      {hasText ? (
        <>
          <Form.Check id={`${ids}-tile`} type="checkbox" label={t('mark.tile')} checked={stamp.tile} onChange={(event) => setStamp({ tile: event.target.checked })} />

          {stamp.tile ? null : (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-anchor`}>
                {t('mark.anchorLabel')}
              </label>
              <Form.Select id={`${ids}-anchor`} value={stamp.anchor} onChange={(event) => setStamp({ anchor: event.target.value as MarkAnchor })}>
                {MARK_ANCHORS.map((anchor) => (
                  <option key={anchor} value={anchor}>
                    {t(`mark.anchor.${anchor}`)}
                  </option>
                ))}
              </Form.Select>
            </div>
          )}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-color`}>
              {t('mark.colorLabel')}
            </label>
            <Form.Select id={`${ids}-color`} value={stamp.color} onChange={(event) => setStamp({ color: event.target.value as MarkColor })}>
              {MARK_COLORS.map((color) => (
                <option key={color} value={color}>
                  {t(`mark.color.${color}`)}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="erp-flow-field">
            <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-size`}>
              {t('mark.sizeLabel')}
              <output className="erp-image-range__value">{Math.round(stamp.sizeRatio * 100)}%</output>
            </label>
            <Form.Range id={`${ids}-size`} min={2} max={15} step={1} value={Math.round(stamp.sizeRatio * 100)} onChange={(event) => setStamp({ sizeRatio: Number(event.target.value) / 100 })} />
          </div>

          <div className="erp-flow-field">
            <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-opacity`}>
              {t('mark.opacityLabel')}
              <output className="erp-image-range__value">{Math.round(stamp.opacity * 100)}%</output>
            </label>
            <Form.Range id={`${ids}-opacity`} min={10} max={100} step={5} value={Math.round(stamp.opacity * 100)} onChange={(event) => setStamp({ opacity: Number(event.target.value) / 100 })} />
          </div>
        </>
      ) : null}
    </>
  )
}
