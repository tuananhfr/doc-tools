import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon, useToast } from '@/components/ui'
import { CopyButton, downloadOutput, useDownloadNudge } from '@/features/tools/hub'
import { CodeWorkspace, QrStudio } from '../components/QrStudio'
import { QrColorPicker } from '../components/QrColorPicker'
import { QrContentForm } from '../components/QrContentForm'
import { QrPreview } from '../components/QrPreview'
import { QR_COLORS, qrBackgroundColor, qrContrast, type QrBackground } from '../config/qr-colors'
import { qrPdfBlob, qrPngBlob, qrSvgBlob } from '../services/qr-render'
import type { QrForm } from '../types/qr.types'
import { qrFileName } from '../utils/qr-file-name'
import { createMatrix } from '../utils/qr-matrix'
import { buildPayload, INITIAL_QR_FORM } from '../utils/qr-payload'
import { usePihTemplatesEnabled } from '@/features/tools/pih-templates/hooks/usePihTemplatesEnabled'
import { PIH_QR_SAMPLE_PATCH } from '@/features/tools/pih-templates/generators/pih-qr-sample'

/**
 * TẠO MÃ QR — mã vẽ lại theo từng phím gõ, không có nút "Tạo". Thứ nằm trong mã
 * được in ra nguyên văn bên dưới: người dùng thấy đúng chuỗi mà máy quét sẽ đọc.
 */
import DynamicQrPage from './DynamicQrPage'
import LabelSheetPage from './LabelSheetPage'

export default function QrCreatePage() {
  const { t } = useTranslation('qr')
  const [dynamic, setDynamic] = useState(false)
  const [labels, setLabels] = useState(false)
  const [openedLabels, setOpenedLabels] = useState(false)
  return <QrStudio kind="create" online={dynamic && !labels}><div className="cn-qr-create-workspace">
    <div className="cn-qr-mode-switch mb-3" role="group" aria-label={t('dynamic.mode')}>
      <Button variant={dynamic || labels ? 'outline-secondary' : 'primary'} aria-label={t('dynamic.static')} aria-pressed={!dynamic && !labels} onClick={() => { setDynamic(false); setLabels(false) }}>{t('dynamic.staticShort')}</Button>
      <Button variant={dynamic && !labels ? 'primary' : 'outline-secondary'} aria-label={t('dynamic.dynamic')} aria-pressed={dynamic && !labels} onClick={() => { setDynamic(true); setLabels(false) }}>{t('dynamic.dynamicShort')}</Button>
      <Button variant={labels ? 'primary' : 'outline-secondary'} aria-label={t('labels.tab')} aria-pressed={labels} onClick={() => { setLabels(true); setOpenedLabels(true) }}>{t('labels.short')}</Button>
    </div>
    <div hidden={dynamic || labels}><StaticQrCreatePage /></div>
    <div hidden={!dynamic || labels}><DynamicQrPage embedded /></div>
    {openedLabels ? <div hidden={!labels}><LabelSheetPage /></div> : null}
  </div></QrStudio>
}

function StaticQrCreatePage() {
  const { t } = useTranslation('qr')
  const { t: tc } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.qrCreate' })
  const { t: s } = useTranslation('qr', { keyPrefix: 'codeStudio' })
  const { t: pih } = useTranslation('qr', { keyPrefix: 'pihSample' })
  const toast = useToast()
  const nudge = useDownloadNudge()
  const pihEnabled = usePihTemplatesEnabled()
  const [form, setForm] = useState<QrForm>(INITIAL_QR_FORM)
  const [colorId, setColorId] = useState(QR_COLORS[0].id)
  const [background, setBackground] = useState<QrBackground>({ mode: 'white', color: '#ffffff' })

  const payload = buildPayload(form)
  const text = payload.ok ? payload.text : null
  const matrix = useMemo(() => (text === null ? null : createMatrix(text)), [text])
  const color = (QR_COLORS.find((item) => item.id === colorId) ?? QR_COLORS[0]).value
  const backgroundColor = qrBackgroundColor(background)

  const tooLong = text !== null && matrix === null
  const error = tooLong ? t('qrCreate.tooLong') : payload.ok ? null : payload.reason

  const download = async (type: 'png' | 'svg' | 'pdf') => {
    if (!matrix) return
    try {
      const blob = type === 'png' ? await qrPngBlob(matrix, color, backgroundColor)
        : type === 'svg' ? qrSvgBlob(matrix, color, backgroundColor)
          : await qrPdfBlob(matrix, color, backgroundColor)
      downloadOutput({ name: `${qrFileName(form)}.${type}`, blob })
      nudge.onDownloaded()
    } catch {
      toast.error(t('qrCreate.renderFailed'))
    }
  }

  return <CodeWorkspace inputTitle={s('create.input')} previewTitle={s('preview')}
    input={<>
      <p className="cn-codestudio-hint">{studio('inputHint')}</p>
      {pihEnabled ? <Button type="button" variant="outline-primary" size="sm" className="cn-codestudio-pihsample" onClick={() => setForm(current => ({ ...current, ...PIH_QR_SAMPLE_PATCH }))}><Icon name="stars" />{pih('button')}</Button> : null}
      <QrContentForm kindPicker="tiles" form={form} error={error} onChange={patch => setForm(current => ({ ...current, ...patch }))} />
      <details className="cn-codestudio-options"><summary><Icon name="sliders" />{tc('workspace.customize')}<Icon name="chevron-down" /></summary>
        <QrColorPicker value={colorId} onChange={setColorId} background={background} onBackgroundChange={setBackground} />
        {backgroundColor === null ? <p className="erp-flow-field__hint">{t('qrCreate.transparentHint')}</p> : qrContrast(color, backgroundColor) < 4.5 ? <p className="erp-flow-field__hint">{t('qrCreate.lowContrast')}</p> : null}
      </details>
      <p className="cn-codestudio-note"><Icon name="lightning-charge" />{s('live')}</p>
    </>}
    preview={<>
      <QrPreview matrix={matrix} color={color} background={backgroundColor} placeholder={error ? t('qrCreate.notCreated') : t('shared.enterToCreate')} />
      {text !== null && matrix ? <div className="cn-codestudio-payload"><span>{t('shared.codeContent')}</span><p className="erp-qr-payload">{text}</p><CopyButton text={text} size="sm" /></div> : null}
      <div className="cn-codestudio-downloads"><Button disabled={!matrix} onClick={() => void download('png')}><Icon name="download" />{t('qrCreate.downloadPng')}</Button><div>
        <Button variant="outline-primary" disabled={!matrix} onClick={() => void download('svg')}>SVG</Button>
        <Button variant="outline-primary" disabled={!matrix} onClick={() => void download('pdf')}>PDF</Button>
      </div></div>
      <p className="cn-codestudio-note"><Icon name="qr-code-scan" />{s('scanBeforeSharing')}</p>
      {nudge.extra}
    </>} />
}
