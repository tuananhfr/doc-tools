import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { postToHost, useEmbed } from '@/features/embed'
import { FilePicker, ToolBoard, WorkspaceGuide } from '@/features/tools/hub'
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
  const [hits, setHits] = useState<ScanHit[]>([])
  const [misses, setMisses] = useState<ScanMiss[]>([])
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null)
  const [camera, setCamera] = useState(false)

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

  return (
    <ToolBoard layout="balanced" className="cn-qr-workspace"
      sideLabel={t('read.results')}
      side={
        <>
          <div className="cn-qr-result-card">
          <div className="erp-tool-side-head">
            <h2 className="erp-flow-options__title"><Icon name="qr-code-scan" /> {t('read.results')}</h2>
            {hits.length > 0 ? (
              <Button variant="link" size="sm" className="erp-flow-files__clear" onClick={() => setHits([])}>
                {t('read.clearAll')}
              </Button>
            ) : null}
          </div>
          <p className="cn-qr-result-status" role="status" aria-live="polite">{hits.length > 0 ? t('read.resultsCount', { count: hits.length }) : common('studio.qr.resultHint')}</p>
          {hits.length === 0 ? (
            <div className="cn-qr-empty"><span className="cn-qr-empty__code" aria-hidden="true"><Icon name="qr-code" /></span><p>{t('read.empty')}</p></div>
          ) : (
            <ScanResultList hits={hits} onRemove={(id) => setHits((current) => current.filter((hit) => hit.id !== id))} />
          )}
          <p className="cn-qr-safety"><Icon name="shield-check" />{t('read.safety')}</p>
          </div>
          <WorkspaceGuide steps={[common('studio.qr.stepUpload'), common('studio.qr.stepRead'), common('studio.qr.stepCheck')]} tip={common('studio.qr.tip')} />
        </>
      }
    >
      <section className="cn-studio-card cn-qr-input">
      <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="qr-code-scan" /></span><div><h2>{common('studio.qr.inputTitle')}</h2><p>{t('read.pickHint')}</p></div></div>
      <div className="cn-qr-methods" role="group" aria-label={common('studio.qr.inputTitle')}>
        <button type="button" aria-pressed={!camera} onClick={() => setCamera(false)}><Icon name="image" />{common('studio.qr.imageTab')}</button>
        <button type="button" aria-pressed={camera} onClick={() => setCamera(true)}><Icon name="camera" />{t('read.camera')}</button>
      </div>
      <FilePicker
        accept={ACCEPT}
        multiple
        title={t('read.pickTitle')}
        hint={t('read.pickHint')}
        compact={hits.length > 0 || camera}
        loading={loading}
        disabled={false}
        onFiles={(files) => void scanFiles(files)}
      />

      {misses.length > 0 ? (
        <div className="erp-flow-rejected" role="alert">
          <Icon name="exclamation-triangle" className="erp-flow-rejected__icon" />
          <div className="erp-flow-rejected__body">
            <p className="erp-flow-rejected__title">{t('read.missTitle', { count: misses.length })}</p>
            <ul className="erp-flow-rejected__list">
              {misses.slice(0, 5).map((miss, index) => (
                <li key={`${miss.name}-${index}`}>
                  <strong>{miss.name}</strong> — {miss.reason}
                </li>
              ))}
              {misses.length > 5 ? <li>{t('read.moreMisses', { count: misses.length - 5 })}</li> : null}
            </ul>
          </div>
          <button type="button" className="btn erp-flow-rejected__close" aria-label={t('read.hideNotice')} onClick={() => setMisses([])}>
            <Icon name="x-lg" />
          </button>
        </div>
      ) : null}

      {camera ? <QrCamera onRead={addRead} onClose={() => setCamera(false)} /> : null}
      <div className="cn-studio-local-note"><Icon name="shield-check" />{common('tool.privacyFile')}</div>
      </section>
    </ToolBoard>
  )
}
