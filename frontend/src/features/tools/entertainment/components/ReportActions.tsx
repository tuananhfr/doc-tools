import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { entResult } from '../services/entertainment.api'
import type { DrawResult } from '../types/entertainment.types'
import type { ReportDocument } from '../services/report-export'
import { EntertainmentFailure } from './EntertainmentFailure'

export function ReportActions({ title, lines, disabled = false, drawKey }: { title: string; lines: string[]; disabled?: boolean; drawKey?: string }) {
  const { t } = useTranslation('entertainment'); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null)
  const download = async (format: 'pdf' | 'png') => {
    if (busy || disabled) return
    setBusy(true); setError(null)
    try {
      if (drawKey) await entResult<DrawResult>('reports', { draw_key: drawKey })
      const report: ReportDocument = { title, lines, disclaimer: t('disclaimer') }
      const { exportReport } = await import('../services/report-export')
      const blob = await exportReport(report, format)
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = `chuyen-nho-ket-qua.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }
  return <div className="cn-ent-export"><p>{t('report.local')}</p><div className="cn-ent-actions"><button className="cn-button" disabled={disabled || busy} onClick={() => void download('pdf')}>{t(busy ? 'actions.exporting' : 'actions.pdf')}</button><button className="cn-button cn-button--ghost" disabled={disabled || busy} onClick={() => void download('png')}>{t('actions.png')}</button></div>{error ? <EntertainmentFailure error={error} /> : null}</div>
}
