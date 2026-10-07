import { useId, useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { parseDecimal, useFlowRun } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { useImageFiles } from '../hooks/useImageFiles'
import { batchImagesTask } from '../services/batch-tasks'
import { canEncodeWebp, writableFormat } from '../services/image-codec'
import type { ImageFormat } from '../types/image.types'
import { DEFAULT_PATTERN, isResizeValue, patternProblem, renameAll, RESIZE_LIMIT, type ResizeMode } from '../utils/batch'
import { IMAGE_FORMAT } from '../utils/image-format'

type Target = ImageFormat | 'keep'
type Quality = 'high' | 'medium' | 'small'

const QUALITY_VALUE: Record<Quality, number> = { high: 0.92, medium: 0.8, small: 0.6 }

const RESIZE_MODES: { value: ResizeMode; unit: string }[] = [
  { value: 'keep', unit: '' },
  { value: 'edge', unit: 'px' },
  { value: 'width', unit: 'px' },
  { value: 'height', unit: 'px' },
  { value: 'percent', unit: '%' },
]

const FIRST_VALUE: Record<ResizeMode, string> = { keep: '', edge: '1920', width: '1280', height: '1080', percent: '50' }

/** ẢNH HÀNG LOẠT — đổi cỡ, đổi định dạng và đổi tên cả lô trong một lượt. */
export default function BatchImagePage() {
  const { t } = useTranslation('image')
  const ids = useId()
  const images = useImageFiles({ multiple: true })
  const run = useFlowRun()
  const [mode, setMode] = useState<ResizeMode>('edge')
  const [values, setValues] = useState(FIRST_VALUE)
  const [format, setFormat] = useState<Target>('keep')
  const [quality, setQuality] = useState<Quality>('high')
  const [pattern, setPattern] = useState(DEFAULT_PATTERN)
  const [startText, setStartText] = useState('1')
  // Safari không ghi được WebP — không mời thứ trình duyệt này không làm được.
  const [webp] = useState(canEncodeWebp)

  const count = images.items.length
  const value = mode === 'keep' ? null : parseDecimal(values[mode])
  const valueOk = isResizeValue(mode, value)
  const start = parseDecimal(startText)
  const startOk = start !== null && Number.isInteger(start) && start >= 0 && start <= 999_999
  const patternError = patternProblem(pattern)
  const numbered = pattern.includes('{n}')
  const lossy = format !== 'png' && (format !== 'keep' || images.items.some((item) => item.format !== 'png'))

  const blocked = !valueOk
    ? t('batch.sizeRange', { min: RESIZE_LIMIT[mode as Exclude<ResizeMode, 'keep'>].min, max: RESIZE_LIMIT[mode as Exclude<ResizeMode, 'keep'>].max })
    : patternError
      ? patternError
      : numbered && !startOk
        ? t('batch.startInvalid')
        : null

  const sample =
    count > 0 && !patternError && (!numbered || startOk)
      ? renameAll(
          images.items.slice(0, 2).map((item) => item.name),
          images.items.slice(0, 2).map((item) => IMAGE_FORMAT[format === 'keep' ? writableFormat(item.format) : format].extension),
          { pattern, start: startOk ? start : 1 },
        )
      : []

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple
      pickerTitle={t('batch.pickerTitle')}
      runLabel={count > 1 ? t('batch.runMany', { count }) : t('batch.runOne')}
      runIcon="collection"
      blocked={blocked}
      task={() =>
        batchImagesTask(images.items, {
          resize: { mode, value: value ?? 0 },
          format,
          quality: QUALITY_VALUE[quality],
          rename: { pattern, start: startOk ? start : 1 },
        })
      }
      options={
        <>
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-mode`}>
              {t('batch.resizeLabel')}
            </label>
            <Form.Select id={`${ids}-mode`} value={mode} onChange={(event) => setMode(event.target.value as ResizeMode)}>
              {RESIZE_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`batch.resize.${option.value}`)}
                </option>
              ))}
            </Form.Select>
          </div>
          {mode === 'keep' ? null : (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-value`}>
                {t(`batch.resize.${mode}`)}
              </label>
              <InputGroup hasValidation={false}>
                <Form.Control
                  id={`${ids}-value`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values[mode]}
                  isInvalid={!valueOk}
                  onChange={(event) => setValues((current) => ({ ...current, [mode]: event.target.value }))}
                />
                <InputGroup.Text>{RESIZE_MODES.find((option) => option.value === mode)?.unit}</InputGroup.Text>
              </InputGroup>
              <p className="erp-flow-field__hint">{t('batch.resizeHint')}</p>
            </div>
          )}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-format`}>
              {t('batch.formatLabel')}
            </label>
            <Form.Select id={`${ids}-format`} value={format} onChange={(event) => setFormat(event.target.value as Target)}>
              <option value="keep">{t('batch.keepFormat')}</option>
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              {webp ? <option value="webp">WebP</option> : null}
            </Form.Select>
          </div>
          {lossy ? (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-quality`}>
                {t('batch.qualityLabel')}
              </label>
              <Form.Select id={`${ids}-quality`} value={quality} onChange={(event) => setQuality(event.target.value as Quality)}>
                <option value="high">{t('batch.quality.high')}</option>
                <option value="medium">{t('batch.quality.medium')}</option>
                <option value="small">{t('batch.quality.small')}</option>
              </Form.Select>
            </div>
          ) : null}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-pattern`}>
              {t('batch.patternLabel')}
            </label>
            <Form.Control
              id={`${ids}-pattern`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={pattern}
              isInvalid={patternError !== null}
              onChange={(event) => setPattern(event.target.value)}
            />
            <p className="erp-flow-field__hint">
              <Trans ns="image" i18nKey="batch.patternHint" components={{ code: <code /> }} />
            </p>
          </div>
          {numbered ? (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-start`}>
                {t('batch.startLabel')}
              </label>
              <Form.Control id={`${ids}-start`} type="text" inputMode="numeric" autoComplete="off" value={startText} isInvalid={!startOk} onChange={(event) => setStartText(event.target.value)} />
            </div>
          ) : null}
          {sample.length > 0 ? (
            <p className="erp-flow-field__hint erp-image-output">
              <Trans ns="image" i18nKey="batch.sample" values={{ names: sample.join(', ') }} components={{ strong: <strong /> }} />
              {count > sample.length ? '…' : ''}
            </p>
          ) : null}
        </>
      }
    />
  )
}
