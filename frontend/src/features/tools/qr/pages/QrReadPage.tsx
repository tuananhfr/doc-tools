import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { postToHost, useEmbed } from '@/features/embed'
import { FilePicker } from '@/features/tools/hub'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { newId } from '@/utils/id'
import { QrCamera } from '../components/QrCamera'
import { ScanResultList } from '../components/ScanResultList'
import { scanImage, scanLimitReason, type ScanRead } from '../services/qr-scan'
import type { ScanHit } from '../types/qr.types'
import { traceReportText } from '../utils/trace-report'

/** Ảnh không cho ra kết quả, kèm lý do để người dùng biết nên đổi ảnh hay đổi tệp. */
interface ScanMiss {
  name: string
  reason: string
}

const ACCEPT = 'image/*'

/**
 * ĐỌC MÃ QR / MÃ VẠCH — từ ảnh (chọn, thả, dán) hoặc camera. Không tự mở thứ gì:
 * mã chỉ được đọc ra chữ, người dùng xem rồi tự quyết định mở hay chép.
 */
export default function QrReadPage() {
  const { t } = useTranslation('qr')
  const { t: common } = useTranslation('common')
  const { t: s } = useTranslation('qr', { keyPrefix: 'readStudio' })
  const [hits, setHits] = useState<ScanHit[]>([])
  const [misses, setMisses] = useState<ScanMiss[]>([])
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null)
  const [camera, setCamera] = useState(false)
  const [preview, setPreview] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [view, setView] = useState<'results' | 'image'>('results')
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)

  useEffect(() => {
    if (!preview) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(preview)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview])

  const reportsTrace = useEmbed().capabilities.includes('trace')

  /** Mã vừa đọc lên đầu danh sách; mã đã có thì chỉ đưa lên đầu, không thêm dòng trùng. */
  const addRead = useCallback((read: ScanRead) => {
    // Gửi ngoài hàm cập nhật state: updater có thể chạy hai lần (StrictMode) nên không được có tác dụng phụ.
    const report = reportsTrace ? traceReportText(read.text) : null
    if (report) postToHost({ type: 'qr-scanned', payload: { text: report } })
    setHits((current) => {
      if (current[0]?.text === read.text && current[0].format === read.format) return current
      const rest = current.filter((hit) => hit.text !== read.text || hit.format !== read.format)
      return [{ id: newId(), text: read.text, format: read.format, at: Date.now() }, ...rest]
    })
  }, [reportsTrace])

  const busy = useRef(false)
  const scanFiles = useCallback(
    async (files: File[]) => {
      if (busy.current || files.length === 0) return
      busy.current = true
      setCamera(false)
      setView('results')
      const missed: ScanMiss[] = []
      try {
        for (const [index, file] of files.entries()) {
          setLoading({ done: index, total: files.length })
          const name = file.name || t('read.pastedImage')
          try {
            const blocked = await scanLimitReason(file)
            if (blocked) {
              missed.push({ name, reason: blocked })
              continue
            }
            setPreview(file)
            const read = await scanImage(file)
            if (read) addRead(read)
            else missed.push({ name, reason: t('read.noCode') })
          } catch {
            missed.push({ name, reason: t('read.unreadable') })
          }
        }
      } finally {
        busy.current = false
        setLoading(null)
        setMisses(missed)
      }
    },
    [addRead, t],
  )

  // Dán ảnh chụp màn hình (Ctrl+V) — đường nhanh nhất khi mã nằm trong một trang web / tin nhắn.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
      if (files.length === 0) return
      event.preventDefault()
      void scanFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [scanFiles])

  const sample = async () => {
    if (sampleBusy || busy.current) return
    setSampleBusy(true)
    setSampleFailed(false)
    try {
      const { default: QRCode } = await import('qrcode')
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, 'https://chuyennho.vn', { width: 480, margin: 4, color: { dark: '#0067f4', light: '#ffffff' } })
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('SAMPLE_FAILED')), 'image/png'))
      await scanFiles([new File([blob], 'qr-chuyen-nho.png', { type: 'image/png' })])
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }

  return (
    <ImageStudio toolId="qr-read" icon="qr-code-scan" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')}
      category={{ title: s('category'), icon: 'qr-code', path: '/ma-qr', tools: ['qr-create', 'qr-read', 'barcode-create', 'vietqr', 'code-manager'], relatedTitle: s('related') }}
      steps={([1, 2, 3, 4, 5] as const).map(n => s(`steps.${n}`))}
      tips={([1, 2, 3, 4] as const).map(n => s(`tips.${n}`))}
      faq={([1, 2, 3, 4] as const).map(n => ({ q: s(`faq.${n}.q`), a: s(`faq.${n}.a`) }))}>
      <div className="cn-qrreader-workspace">
        <section className="cn-idstudio-panel cn-qrreader-input">
          <h2>{s('inputTitle')}</h2>
          <div className="cn-qrreader-methods" role="group" aria-label={s('method')}>
            <button type="button" aria-pressed={!camera} disabled={loading !== null || sampleBusy} onClick={() => setCamera(false)}><Icon name="image" /><span>{s('image')}<small>{s('imageHint')}</small></span></button>
            <button type="button" aria-pressed={camera} disabled={loading !== null || sampleBusy} onClick={() => { setCamera(true); setView('results') }}><Icon name="camera" /><span>{s('camera')}<small>{s('cameraHint')}</small></span></button>
          </div>
          <div className="cn-convertstudio-upload" hidden={camera}>
            <FilePicker accept={ACCEPT} multiple title={s('dropTitle')} hint={t('read.pickHint')} compact={false} loading={loading} disabled={sampleBusy} onFiles={files => void scanFiles(files)} />
          </div>
          {camera ? <QrCamera onRead={read => { addRead(read); setView('results') }} onClose={() => setCamera(false)} /> : null}
          {misses.length > 0 ? <div className="erp-flow-rejected" role="alert">
            <Icon name="exclamation-triangle" className="erp-flow-rejected__icon" />
            <div className="erp-flow-rejected__body"><p className="erp-flow-rejected__title">{t('read.missTitle', { count: misses.length })}</p>
              <ul className="erp-flow-rejected__list">{misses.slice(0, 5).map((miss, index) => <li key={index}><strong>{miss.name}</strong> — {miss.reason}</li>)}{misses.length > 5 ? <li>{t('read.moreMisses', { count: misses.length - 5 })}</li> : null}</ul>
            </div>
            <button type="button" className="btn erp-flow-rejected__close" aria-label={t('read.hideNotice')} onClick={() => setMisses([])}><Icon name="x-lg" /></button>
          </div> : null}
          <div className="cn-qrreader-paste"><Icon name="clipboard" /><div><strong>{s('pasteTitle')}</strong><p>{s('pasteHint')}</p></div><kbd>Ctrl + V</kbd></div>
          <div className="cn-qrreader-sample"><span>{s('sampleHint')}</span><Button variant="outline-primary" disabled={sampleBusy || loading !== null} onClick={() => void sample()}><Icon name="qr-code-scan" />{sampleBusy ? s('sampleLoading') : s('sample')}</Button></div>
          {sampleFailed ? <p role="alert" className="cn-qrreader-error">{s('sampleFailed')}</p> : null}
          <p className="cn-idstudio-note"><Icon name="shield-check" />{common('tool.privacyFile')}</p>
        </section>
        <section className="cn-idstudio-panel cn-qrreader-output">
          <h2>{s('outputTitle')}</h2>
          <div className="cn-idstudio-tabs" role="group" aria-label={s('outputTitle')}>
            <button type="button" aria-pressed={view === 'results'} onClick={() => setView('results')}>{s('results')}{hits.length > 0 ? <span className="cn-qrreader-count">{hits.length}</span> : null}</button>
            <button type="button" aria-pressed={view === 'image'} disabled={!previewUrl} onClick={() => setView('image')}>{s('original')}</button>
          </div>
          <p className="cn-qrreader-status" role="status" aria-live="polite">{loading ? s('reading', { current: loading.done + 1, total: loading.total }) : hits.length > 0 ? t('read.resultsCount', { count: hits.length }) : s('resultHint')}</p>
          <div hidden={view !== 'results'}>
            {hits.length === 0 ? <div className="cn-qrreader-empty"><div className="cn-qrreader-scan-frame" aria-hidden="true"><Icon name="qr-code-scan" /></div><strong>{s('emptyTitle')}</strong><p>{t('read.empty')}</p><span><Icon name="upc-scan" />QR · EAN · UPC · Code 128</span></div> : <>
              <div className="cn-qrreader-result-head"><span><Icon name="check-circle-fill" />{s('readSuccess')}</span><Button variant="link" onClick={() => setHits([])}>{t('read.clearAll')}</Button></div>
              <ScanResultList hits={hits} onRemove={id => setHits(current => current.filter(hit => hit.id !== id))} />
              <p className="cn-qrreader-session">{s('sessionHint')}</p>
            </>}
          </div>
          <div hidden={view !== 'image'} className="cn-qrreader-original">{previewUrl ? <><div><img src={previewUrl} alt={preview?.name ?? s('original')} onError={() => { setPreview(null); setView('results') }} /></div><p>{preview?.name}</p></> : null}</div>
          <p className="cn-qrreader-safety"><Icon name="shield-check" />{t('read.safety')}</p>
        </section>
      </div>
      <section className="cn-qrreader-supported"><h2>{s('supportedTitle')}</h2><div>{([['globe', 'website'], ['wifi', 'wifi'], ['person-vcard', 'contact'], ['file-text', 'text'], ['upc', 'product']] as const).map(([icon, key]) => <span key={key}><Icon name={icon} />{s(`supported.${key}`)}</span>)}</div></section>
    </ImageStudio>
  )
}
