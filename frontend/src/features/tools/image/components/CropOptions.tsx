import { useId } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { Size } from '../types/image.types'
import { moveRect, resizeRect, rotatedSize, snapRect } from '../utils/crop-rect'
import { ASPECT_OPTIONS, ASPECT_RATIO, flipped, isPristine, turned, withAspect, type AspectKey, type CropState } from '../utils/crop-state'
import { sizeLabel } from '../utils/image-format'

interface CropOptionsProps {
  item: Size
  state: CropState
  onChange: (change: (state: CropState) => CropState) => void
  onReset: () => void
  section?: 'all' | 'crop' | 'rotate' | 'light' | 'advanced'
}

/** Thanh trượt đi 50%–150%; lưu trong trạng thái là hệ số 0,5–1,5. */
const toPercent = (factor: number) => Math.round(factor * 100)

/** Cột tuỳ chọn của "Cắt & chỉnh ảnh": tỉ lệ khung, xoay, độ sáng, tương phản. */
export function CropOptions({ item, state, onChange, onReset, section = 'all' }: CropOptionsProps) {
  const { t } = useTranslation('image')
  const ids = useId()
  const output = snapRect(state.rect, rotatedSize(item, state.rotation))
  const bounds = rotatedSize(item, state.rotation)
  const setCoordinate = (field: 'x' | 'y' | 'width' | 'height', value: number) => {
    const nextRect = (current: CropState) => field === 'x' || field === 'y'
      ? moveRect(current.rect, field === 'x' ? value - current.rect.x : 0, field === 'y' ? value - current.rect.y : 0, bounds)
      : resizeRect(current.rect, field === 'width' ? 'e' : 's', field === 'width' ? value - current.rect.width : 0, field === 'height' ? value - current.rect.height : 0, bounds, ASPECT_RATIO[current.aspect])
    const applied = nextRect(state)[field]
    onChange(current => ({ ...current, rect: nextRect(current) }))
    return applied
  }

  return (
    <>
      {section === 'all' || section === 'crop' ? <>
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

      {section === 'crop' ? <div className="cn-cropstudio-ratios">{ASPECT_OPTIONS.map(option => {
        const ratio = ASPECT_RATIO[option.value] ?? 4 / 3
        return <button type="button" key={option.value} aria-pressed={state.aspect === option.value} aria-label={t(`crop.aspect.${option.labelKey}`)} onClick={() => onChange(current => withAspect(current, item, option.value))}><span style={{ width: ratio >= 1 ? 28 : 28 * ratio, height: ratio >= 1 ? 28 / ratio : 28 }} /><small>{option.value === 'free' ? t('crop.aspect.free') : option.value}</small></button>
      })}</div> : null}
      </> : null}

      {section === 'all' || section === 'rotate' ? <>
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

      <div className="cn-cropstudio-flips">
        <Button variant="outline-secondary" aria-pressed={!!state.flipX} onClick={() => onChange(current => flipped(current, item, 'x'))}><Icon name="symmetry-vertical" />{t('cropStudio.flipHorizontal')}</Button>
        <Button variant="outline-secondary" aria-pressed={!!state.flipY} onClick={() => onChange(current => flipped(current, item, 'y'))}><Icon name="symmetry-horizontal" />{t('cropStudio.flipVertical')}</Button>
      </div>
      </> : null}

      {section === 'all' || section === 'light' ? <>
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

      {section === 'light' ? <Button variant="outline-secondary" onClick={() => onChange(current => ({ ...current, brightness: 1, contrast: 1 }))}><Icon name="arrow-counterclockwise" />{t('cropStudio.resetLight')}</Button> : null}
      </> : null}

      {section === 'advanced' ? <><p className="cn-idstudio-note">{t('cropStudio.preciseHint')}</p><div className="cn-cropstudio-coordinates">{(['x', 'y', 'width', 'height'] as const).map(field => <label key={field}>{t(`cropStudio.coordinates.${field}`)}<Form.Control key={`${field}-${Math.round(state.rect[field])}`} type="number" inputMode="numeric" defaultValue={Math.round(state.rect[field])} min={field === 'x' || field === 'y' ? 0 : Math.min(16, bounds[field])} max={field === 'x' || field === 'width' ? bounds.width : bounds.height} step={1} onBlur={event => {
        const value = Number(event.target.value)
        if (event.target.value.trim() && Number.isFinite(value)) event.target.value = String(Math.round(setCoordinate(field, Math.round(value))))
        else event.target.value = String(Math.round(state.rect[field]))
      }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} /></label>)}</div><p className="cn-idstudio-note">{t('cropStudio.keyboardHint')}</p></> : null}

      {section === 'all' ? <>
      <p className="erp-flow-field__hint erp-image-output">
        <Trans ns="image" i18nKey="crop.output" values={{ size: sizeLabel(output) }} components={{ strong: <strong /> }} />
      </p>

      <Button variant="link" size="sm" className="erp-image-reset" disabled={isPristine(state, item)} onClick={onReset}>
        <Icon name="arrow-repeat" className="me-2" />
        {t('crop.reset')}
      </Button>
      </> : null}
    </>
  )
}
