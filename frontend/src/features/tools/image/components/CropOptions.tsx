import { useId } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { ImageItem } from '../types/image.types'
import { rotatedSize, snapRect } from '../utils/crop-rect'
import { ASPECT_OPTIONS, isPristine, turned, withAspect, type AspectKey, type CropState } from '../utils/crop-state'
import { sizeLabel } from '../utils/image-format'

interface CropOptionsProps {
  item: ImageItem
  state: CropState
  onChange: (change: (state: CropState) => CropState) => void
  onReset: () => void
}

/** Thanh trượt đi 50%–150%; lưu trong trạng thái là hệ số 0,5–1,5. */
const toPercent = (factor: number) => Math.round(factor * 100)

/** Cột tuỳ chọn của "Cắt & chỉnh ảnh": tỉ lệ khung, xoay, độ sáng, tương phản. */
export function CropOptions({ item, state, onChange, onReset }: CropOptionsProps) {
  const { t } = useTranslation('image')
  const ids = useId()
  const output = snapRect(state.rect, rotatedSize(item, state.rotation))

  return (
    <>
      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-aspect`}>
          {t('crop.aspectLabel')}
        </label>
        <Form.Select id={`${ids}-aspect`} value={state.aspect} onChange={(event) => onChange((current) => withAspect(current, item, event.target.value as AspectKey))}>
          {ASPECT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(`crop.aspect.${option.labelKey}`)}
            </option>
          ))}
        </Form.Select>
      </div>

      <div className="erp-flow-field">
        <span className="erp-flow-field__label">{t('crop.rotate')}</span>
        <div className="erp-image-turn">
          <Button variant="outline-secondary" onClick={() => onChange((current) => turned(current, item, 'ccw'))}>
            <Icon name="arrow-counterclockwise" className="me-2" />
            {t('crop.rotateLeft')}
          </Button>
          <Button variant="outline-secondary" onClick={() => onChange((current) => turned(current, item, 'cw'))}>
            <Icon name="arrow-clockwise" className="me-2" />
            {t('crop.rotateRight')}
          </Button>
        </div>
      </div>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-brightness`}>
          {t('crop.brightness')}
          <output className="erp-image-range__value">{toPercent(state.brightness)}%</output>
        </label>
        <Form.Range
          id={`${ids}-brightness`}
          min={50}
          max={150}
          step={1}
          value={toPercent(state.brightness)}
          onChange={(event) => onChange((current) => ({ ...current, brightness: Number(event.target.value) / 100 }))}
        />
      </div>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-contrast`}>
          {t('crop.contrast')}
          <output className="erp-image-range__value">{toPercent(state.contrast)}%</output>
        </label>
        <Form.Range
          id={`${ids}-contrast`}
          min={50}
          max={150}
          step={1}
          value={toPercent(state.contrast)}
          onChange={(event) => onChange((current) => ({ ...current, contrast: Number(event.target.value) / 100 }))}
        />
      </div>

      <p className="erp-flow-field__hint erp-image-output">
        <Trans ns="image" i18nKey="crop.output" values={{ size: sizeLabel(output) }} components={{ strong: <strong /> }} />
      </p>

      <Button variant="link" size="sm" className="erp-image-reset" disabled={isPristine(state, item)} onClick={onReset}>
        <Icon name="arrow-repeat" className="me-2" />
        {t('crop.reset')}
      </Button>
    </>
  )
}
