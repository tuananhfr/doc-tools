import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { LengthUnit, MeasureReference, MeasureScale, MeasureState } from '../types/measure.types'
import { distance, formatArea, formatLength, polygonArea, polygonPerimeter, summarize } from '../utils/measure'
import type { MeasureAction } from '../utils/measure-state'

interface MeasureOptionsProps {
  state: MeasureState
  scale: MeasureScale | null
  dispatch: (action: MeasureAction) => void
}

const UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
]

const decimal = (value: number) => String(value).replace('.', ',')

/**
 * Ô nhập chiều dài thật. Giữ CHỮ người dùng đang gõ ở đây chứ không dựng lại từ
 * con số: "2," chưa là số, dựng lại từ số là xoá mất dấu phẩy vừa gõ.
 */
function ReferenceLength({ reference, dispatch }: { reference: MeasureReference; dispatch: (action: MeasureAction) => void }) {
  const { t } = useTranslation('image')
  const ids = useId()
  const [text, setText] = useState(() => (reference.length ? decimal(reference.length) : ''))

  return (
    <div className="erp-flow-field">
      <label className="erp-flow-field__label" htmlFor={`${ids}-length`}>
        {t('measure.lengthLabel')}
      </label>
      <div className="erp-measure-length">
        <Form.Control
          id={`${ids}-length`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={t('measure.lengthPlaceholder')}
          // Vừa đặt xong đoạn chuẩn thì việc kế tiếp luôn là nhập chiều dài.
          autoFocus={reference.length === null}
          value={text}
          isInvalid={text.trim() !== '' && reference.length === null}
          onChange={(event) => {
            setText(event.target.value)
            const value = Number(event.target.value.trim().replace(',', '.'))
            dispatch({ type: 'reference-length', length: Number.isFinite(value) && value > 0 ? value : null, unit: reference.unit })
          }}
        />
        <Form.Select
          aria-label={t('measure.unit')}
          value={reference.unit}
          onChange={(event) => dispatch({ type: 'reference-length', length: reference.length, unit: event.target.value as LengthUnit })}
        >
          {UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </Form.Select>
      </div>
      <Button variant="link" size="sm" className="erp-image-reset" onClick={() => dispatch({ type: 'clear-reference' })}>
        {t('measure.clearReference')}
      </Button>
    </div>
  )
}

/** Cột phải của "Đo kích thước ảnh": đoạn chuẩn (quy điểm ảnh ra đơn vị thật) và danh sách số đo. */
export function MeasureOptions({ state, scale, dispatch }: MeasureOptionsProps) {
  const { t } = useTranslation('image')
  const { reference, shapes } = state
  const placing = state.mode === 'reference'
  const { counts } = summarize(shapes)
  const distances = shapes.filter((shape) => shape.kind === 'distance')
  const areas = shapes.filter((shape) => shape.kind === 'area')

  return (
    <>
      <div className="erp-flow-field">
        <span className="erp-flow-field__label">{t('measure.referenceLabel')}</span>
        <p className="erp-flow-field__hint">{t('measure.referenceHint')}</p>
        <Button variant={placing ? 'secondary' : 'outline-secondary'} aria-pressed={placing} onClick={() => dispatch({ type: 'mode', mode: placing ? 'distance' : 'reference' })}>
          <Icon name="bullseye" className="me-2" />
          {placing ? t('measure.placing') : reference ? t('measure.resetReference') : t('measure.setReference')}
        </Button>
      </div>

      {reference ? <ReferenceLength reference={reference} dispatch={dispatch} /> : null}

      {scale ? (
        <p className="erp-flow-field__hint">{t('measure.scaleHint')}</p>
      ) : (
        <p className="erp-measure-warning">
          <Icon name="exclamation-triangle" />
          <span>{reference ? t('measure.noLength') : t('measure.noReference')}</span>
        </p>
      )}

      <div className="erp-flow-field">
        <span className="erp-flow-field__label">{t('measure.results')}</span>
        {shapes.length === 0 ? (
          <p className="erp-flow-field__hint">{t('measure.noResults')}</p>
        ) : (
          <ul className="erp-measure-results">
            {distances.map((shape, index) => (
              <li key={shape.id} className="erp-measure-result">
                <span className="erp-measure-result__name">{t('measure.distanceName', { index: index + 1 })}</span>
                <span className="erp-measure-result__value">{formatLength(distance(shape.points[0], shape.points[1]), scale)}</span>
                <button type="button" className="btn erp-flow-file__button" aria-label={t('measure.removeDistance', { index: index + 1 })} title={t('measure.remove')} onClick={() => dispatch({ type: 'remove', id: shape.id })}>
                  <Icon name="x-lg" />
                </button>
              </li>
            ))}
            {areas.map((shape, index) => (
              <li key={shape.id} className="erp-measure-result">
                <span className="erp-measure-result__name">{t('measure.areaName', { index: index + 1 })}</span>
                <span className="erp-measure-result__value">
                  {formatArea(polygonArea(shape.points), scale)}
                  <span className="erp-measure-result__extra">{t('measure.perimeter', { length: formatLength(polygonPerimeter(shape.points), scale) })}</span>
                </span>
                <button type="button" className="btn erp-flow-file__button" aria-label={t('measure.removeArea', { index: index + 1 })} title={t('measure.remove')} onClick={() => dispatch({ type: 'remove', id: shape.id })}>
                  <Icon name="x-lg" />
                </button>
              </li>
            ))}
            {counts > 0 ? (
              <li className="erp-measure-result erp-measure-result--count">
                <span className="erp-measure-result__name">{t('measure.counted')}</span>
                <span className="erp-measure-result__value">{counts}</span>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </>
  )
}
