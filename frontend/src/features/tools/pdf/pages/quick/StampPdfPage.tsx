import { Fragment, useId, useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { RangeField, ScopeField } from '../../components/decoration-fields'
import { DecorationStage } from '../../components/quick/DecorationStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { useStampImage } from '../../hooks/useStampImage'
import { decorateTask } from '../../services/page-tasks'
import { WATERMARK_COLOR, type Decorations, type PageScope, type StampAnchor, type WatermarkColor } from '../../types/decorations.types'
import { defaultWatermark, resolveScope, WATERMARK_BASE } from '../../utils/decorations'

const ACCEPT: readonly QuickKind[] = ['pdf']

type StampKind = 'text' | 'image'

const KINDS: readonly StampKind[] = ['text', 'image']

const ANCHORS: readonly StampAnchor[] = ['bottomRight', 'bottomLeft', 'bottomCenter', 'topRight', 'topLeft', 'topCenter', 'center', 'middleLeft', 'middleRight']

const IMAGE_MARGIN = 28

/** ĐÓNG DẤU PDF — dấu chữ (watermark) hoặc dấu ảnh / logo lên các trang của một tệp. */
export default function StampPdfPage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const stamp = useStampImage()
  const kinds: FlowChoiceOption<StampKind>[] = KINDS.map((value) => ({ value, label: t(`stamp.kind.${value}`), hint: t(`stamp.kind.${value}Hint`) }))
  const [kind, setKind] = useState<StampKind>('text')
  const [text, setText] = useState(() => defaultWatermark().text)
  const [color, setColor] = useState<WatermarkColor>(WATERMARK_BASE.color)
  const [fontSize, setFontSize] = useState(WATERMARK_BASE.fontSize)
  const [angle, setAngle] = useState(WATERMARK_BASE.angle)
  const [textOpacity, setTextOpacity] = useState(WATERMARK_BASE.opacity)
  const [anchor, setAnchor] = useState<StampAnchor>('bottomRight')
  const [widthRatio, setWidthRatio] = useState(0.25)
  const [imageOpacity, setImageOpacity] = useState(1)
  const [scope, setScope] = useState<PageScope>(WATERMARK_BASE.scope)

  const [item] = quick.items
  const { image } = stamp
  const decorations = useMemo<Decorations>(
    () =>
      kind === 'text'
        ? { headerFooter: null, watermark: { text, fontSize, color, opacity: textOpacity, angle, scope } }
        : {
            headerFooter: null,
            watermark: null,
            imageStamp: image ? { bytes: image.bytes, mime: image.mime, aspect: image.aspect, anchor, widthRatio, margin: IMAGE_MARGIN, opacity: imageOpacity, scope } : null,
          },
    [kind, text, fontSize, color, textOpacity, angle, image, anchor, widthRatio, imageOpacity, scope],
  )

  const resolved = item
    ? resolveScope(
        scope,
        item.pages.map((page) => page.id),
      )
    : null
  const scopeError = resolved && !resolved.ok ? resolved.message : undefined
  const blocked =
    kind === 'text' && text.trim() === ''
      ? t('stamp.blockedNoText')
      : kind === 'image' && !image
        ? t('stamp.blockedNoImage')
        : (scopeError ?? (resolved?.ok && resolved.ids.size === 0 ? t('shared.scopeEmpty') : null))

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple={false}
      pickerTitle={t('stamp.pickerTitle')}
      stage={(running) => (item ? <DecorationStage item={item} decorations={decorations} stampUrl={image?.url} disabled={running} onClear={quick.clear} /> : null)}
      runLabel={t('stamp.run')}
      runIcon="droplet-half"
      blocked={blocked}
      task={() => decorateTask(item, decorations, { suffix: t('file.stamped'), title: t('stamp.doneTitle') })}
      options={
        <>
          <FlowChoice legend={t('stamp.kindLegend')} value={kind} options={kinds} onChange={setKind} />

          {/* Khoá riêng cho từng nhánh: không có thì React tái dùng ô chữ làm ô chọn tệp (controlled -> uncontrolled). */}
          {kind === 'text' ? (
            <Fragment key="text">
              <Form.Group controlId={`${ids}-text`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">{t('stamp.content')}</Form.Label>
                <Form.Control value={text} maxLength={60} autoComplete="off" isInvalid={text.trim() === ''} onChange={(event) => setText(event.target.value)} />
              </Form.Group>
              <Form.Group controlId={`${ids}-color`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">{t('stamp.color')}</Form.Label>
                <Form.Select value={color} onChange={(event) => setColor(event.target.value as WatermarkColor)}>
                  {Object.values(WATERMARK_COLOR).map((value) => (
                    <option key={value} value={value}>
                      {t(`color.${value}`)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <RangeField label={t('shared.fontSize')} value={fontSize} min={16} max={160} step={4} format={(size) => `${size} pt`} onChange={setFontSize} />
              <RangeField label={t('shared.opacity')} value={Math.round(textOpacity * 100)} min={5} max={100} step={5} format={(percent) => `${percent}%`} onChange={(percent) => setTextOpacity(percent / 100)} />
              <RangeField label={t('stamp.angle')} value={angle} min={-90} max={90} step={15} format={(degrees) => `${degrees}°`} onChange={setAngle} />
            </Fragment>
          ) : (
            <Fragment key="image">
              <Form.Group controlId={`${ids}-image`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">{t('stamp.image')}</Form.Label>
                <Form.Control
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  isInvalid={!!stamp.error}
                  aria-describedby={`${ids}-image-help`}
                  onChange={(event) => {
                    const file = (event.target as HTMLInputElement).files?.[0]
                    if (file) void stamp.pick(file)
                  }}
                />
                {stamp.error ? (
                  <Form.Control.Feedback type="invalid" data-code={stamp.error.code}>
                    {stamp.error.message}
                  </Form.Control.Feedback>
                ) : null}
                <Form.Text id={`${ids}-image-help`} className="erp-flow-field__hint">
                  {stamp.loading ? t('shared.openingImage') : image ? t('shared.usingImage', { name: image.name }) : t('stamp.imageHint')}
                </Form.Text>
              </Form.Group>
              <Form.Group controlId={`${ids}-anchor`} className="erp-flow-field">
                <Form.Label className="erp-flow-field__label">{t('shared.position')}</Form.Label>
                <Form.Select value={anchor} onChange={(event) => setAnchor(event.target.value as StampAnchor)}>
                  {ANCHORS.map((value) => (
                    <option key={value} value={value}>
                      {t(`anchor.${value}`)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <RangeField label={t('stamp.width')} value={Math.round(widthRatio * 100)} min={5} max={100} step={5} format={(percent) => t('shared.percentOfPage', { percent })} onChange={(percent) => setWidthRatio(percent / 100)} />
              <RangeField label={t('shared.opacity')} value={Math.round(imageOpacity * 100)} min={10} max={100} step={5} format={(percent) => `${percent}%`} onChange={(percent) => setImageOpacity(percent / 100)} />
            </Fragment>
          )}

          <ScopeField value={scope} error={scopeError} mergeKey="scope" onChange={setScope} />
          <p className="erp-flow-field__hint">{t('stamp.disclaimer')}</p>
        </>
      }
    />
  )
}
