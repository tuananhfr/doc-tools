import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon, useToast } from '@/components/ui'
import { describeError, downloadOutput, ToolBoard, ToolPanel, ToolSegments, useDownloadNudge } from '@/features/tools/hub'
import { BarcodeBatch } from '../components/BarcodeBatch'
import { BarcodeOptions } from '../components/BarcodeOptions'
import { BarcodePreview } from '../components/BarcodePreview'
import { Gs1Notice } from '../components/Gs1Notice'
import { QrModeTabs } from '../components/QrModeTabs'
import { barcodeKind } from '../config/barcode-kinds'
import { useBarcodeEngine } from '../hooks/useBarcodeEngine'
import type { BarcodeLook } from '../services/barcode-render'
import type { BarcodeFileType, BarcodeKind } from '../types/barcode.types'
import { checkBarcode, gs1PrefixNote } from '../utils/barcode-check'
import { barcodeFileName } from '../utils/qr-file-name'

type Mode = 'single' | 'batch'

const MODES = [
  { value: 'single' as const, icon: 'upc' },
  { value: 'batch' as const, icon: 'list-ol' },
]

const FILE_TYPES: { type: BarcodeFileType; icon: string }[] = [
  { type: 'png', icon: 'download' },
  { type: 'svg', icon: 'vector-pen' },
  { type: 'pdf', icon: 'file-earmark-pdf' },
]

/**
 * TẠO MÃ VẠCH — EAN-13/8, ITF-14 (có số kiểm tra), Code 128, Code 39; một mã
 * hoặc cả lô từ CSV / Excel. Vẽ hoàn toàn trong trình duyệt bằng bwip-js.
 */
export default function BarcodeCreatePage() {
  const { t } = useTranslation('qr')
  const toast = useToast()
  const nudge = useDownloadNudge()
  const engine = useBarcodeEngine()
  const [mode, setMode] = useState<Mode>('single')
  const [kind, setKind] = useState<BarcodeKind>('code128')
  const [text, setText] = useState('')
  const [look, setLook] = useState<BarcodeLook>({ includeText: true, heightMm: 15, magnification: 1 })

  const spec = barcodeKind(kind)
  const check = useMemo(() => (text.trim() === '' ? null : checkBarcode(kind, text)), [kind, text])
  const ready = engine.status === 'ready' ? engine.engine : null

  const drawn = useMemo(() => {
    if (!ready || !check?.ok) return { svg: null, error: null }
    try {
      return { svg: ready.svg({ kind, value: check.value }, look), error: null }
    } catch (error) {
      return { svg: null, error: describeError(error, t('barcode.drawFailed')).message }
    }
  }, [ready, check, kind, look, t])

  const prefix = check?.ok && spec.gs1 ? gs1PrefixNote(check.value) : null

  const download = async (type: BarcodeFileType) => {
    if (!ready || !check?.ok) return
    const item = { kind, value: check.value }
    try {
      const blob =
        type === 'svg' ? new Blob([ready.svg(item, look)], { type: 'image/svg+xml' }) : type === 'png' ? await ready.png(item, look) : await ready.pdf([item], look)
      downloadOutput({ name: `${barcodeFileName(check.value)}.${type}`, blob })
      nudge.onDownloaded()
    } catch (error) {
      toast.error(describeError(error, t('barcode.fileFailed')).message)
    }
  }

  const placeholder =
    engine.status === 'failed' ? t('barcode.engineFailed') : engine.status === 'loading' ? t('barcode.engineLoading') : t('shared.enterToCreate')

  return (
    <ToolBoard
      sideLabel={t('barcode.side')}
      side={
        mode === 'single' ? (
          <>
            <BarcodePreview svg={drawn.svg} label={t('barcode.previewLabel', { kind: spec.label, value: check?.ok ? check.value : '' })} placeholder={drawn.error ?? placeholder} />
            {check?.ok ? (
              <div className="erp-flow-field">
                <span className="erp-flow-field__label">{t('shared.codeContent')}</span>
                <p className="erp-qr-payload">{check.value}</p>
              </div>
            ) : null}
            {FILE_TYPES.map((item, index) => (
              <Button
                key={item.type}
                variant={index === 0 ? 'primary' : 'outline-secondary'}
                className={index === 0 ? 'erp-flow__run' : undefined}
                disabled={!drawn.svg}
                onClick={() => void download(item.type)}
              >
                <Icon name={item.icon} className="me-2" />
                {t(`barcode.files.${item.type}`)}
              </Button>
            ))}
            {nudge.extra}
          </>
        ) : (
          // Cột phụ đã là một thẻ — bọc thêm ToolPanel là hai lớp viền lồng nhau.
          <>
            <h2 className="erp-tool-panel__title">{t('barcode.styleTitle')}</h2>
            <BarcodeOptions kind={kind} look={look} onKind={setKind} onLook={(patch) => setLook((current) => ({ ...current, ...patch }))} />
          </>
        )
      }
    >
      <QrModeTabs current="barcode-create" />
      <ToolSegments label={t('barcode.modeLabel')} value={mode} options={MODES.map((item) => ({ ...item, label: t(`barcode.modes.${item.value}`) }))} onChange={setMode} />

      {mode === 'single' ? (
        <ToolPanel title={t('shared.contentPanel')}>
          <Form.Group controlId="barcode-value" className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">{t('shared.value')}</Form.Label>
            <Form.Control
              value={text}
              placeholder={t(`barcodeKinds.${kind}.placeholder`)}
              inputMode={spec.gs1 ? 'numeric' : 'text'}
              autoComplete="off"
              isInvalid={check?.ok === false}
              onChange={(event) => setText(event.target.value)}
            />
            {check && !check.ok ? <Form.Control.Feedback type="invalid">{check.reason}</Form.Control.Feedback> : null}
          </Form.Group>
          {check?.ok
            ? [...check.notes, ...(prefix ? [prefix] : [])].map((note) => (
                <p key={note} className="erp-barcode-note">
                  <Icon name="info-circle" />
                  {note}
                </p>
              ))
            : null}
          <BarcodeOptions kind={kind} look={look} onKind={setKind} onLook={(patch) => setLook((current) => ({ ...current, ...patch }))} />
          {spec.gs1 ? <Gs1Notice /> : null}
        </ToolPanel>
      ) : (
        <ToolPanel title={t('barcode.listTitle')}>
          {spec.gs1 ? <Gs1Notice /> : null}
          <BarcodeBatch kind={kind} look={look} engine={ready} />
        </ToolPanel>
      )}
    </ToolBoard>
  )
}
