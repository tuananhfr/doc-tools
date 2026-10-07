import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { FilePicker, ToolBoard } from '@/features/tools/hub'
import { newId } from '@/utils/id'
import { QrCamera } from '../components/QrCamera'
import { QrModeTabs } from '../components/QrModeTabs'
import { ScanResultList } from '../components/ScanResultList'
import { scanImage, scanLimitReason, type ScanRead } from '../services/qr-scan'
import type { ScanHit } from '../types/qr.types'

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
  const [hits, setHits] = useState<ScanHit[]>([])
  const [misses, setMisses] = useState<ScanMiss[]>([])
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null)
  const [camera, setCamera] = useState(false)

  /** Mã vừa đọc lên đầu danh sách; mã đã có thì chỉ đưa lên đầu, không thêm dòng trùng. */
  const addRead = useCallback((read: ScanRead) => {
    setHits((current) => {
      if (current[0]?.text === read.text && current[0].format === read.format) return current
      const rest = current.filter((hit) => hit.text !== read.text || hit.format !== read.format)
      return [{ id: newId(), text: read.text, format: read.format, at: Date.now() }, ...rest]
    })
  }, [])

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
    <ToolBoard
      sideLabel={t('read.results')}
      side={
        <>
          <div className="erp-tool-side-head">
            <h2 className="erp-flow-options__title">{hits.length > 0 ? t('read.resultsCount', { count: hits.length }) : t('read.results')}</h2>
            {hits.length > 0 ? (
              <Button variant="link" size="sm" className="erp-flow-files__clear" onClick={() => setHits([])}>
                {t('read.clearAll')}
              </Button>
            ) : null}
          </div>
          {hits.length === 0 ? (
            <p className="erp-flow-field__hint">{t('read.empty')}</p>
          ) : (
            <ScanResultList hits={hits} onRemove={(id) => setHits((current) => current.filter((hit) => hit.id !== id))} />
          )}
          <p className="erp-flow-field__hint">{t('read.safety')}</p>
        </>
      }
    >
      <QrModeTabs current="qr-read" />

      <FilePicker
        accept={ACCEPT}
        multiple
        title={t('read.pickTitle')}
        hint={t('read.pickHint')}
        compact={hits.length > 0 || camera}
        loading={loading}
        disabled={false}
        onFiles={(files) => void scanFiles(files)}
        extra={
          camera ? null : (
            <Button variant="outline-secondary" className="erp-flow-picker__pick" onClick={() => setCamera(true)}>
              <Icon name="camera" className="me-2" />
              {t('read.camera')}
            </Button>
          )
        }
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
    </ToolBoard>
  )
}
