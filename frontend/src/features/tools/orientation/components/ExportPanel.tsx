import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon, useToast } from '@/components/ui'
import { canShare, describeError, downloadOutput, FlowChoice, shareOutput, ToolPanel, useDownloadNudge, type FlowNote, type FlowOutput } from '@/features/tools/hub'
import type { ExportFormat, ExportResult } from '../services/orientation-export'

interface ExportPanelProps {
  /** Vì sao chưa lưu được; null = lưu được. */
  blocked: string | null
  sourceKind: 'image' | 'pdf' | 'none'
  disabled: boolean
  onBuild: (format: ExportFormat) => Promise<ExportResult>
  onBusy: (busy: boolean) => void
}

const TONE_ICON: Record<FlowNote['tone'], string> = { success: 'check-circle', info: 'info-circle', warning: 'exclamation-triangle' }

/** Lưu ảnh / PDF có la bàn + chú thích số đo — tệp mới, tệp gốc không bị sửa. */
export function ExportPanel({ blocked, sourceKind, disabled, onBuild, onBusy }: ExportPanelProps) {
  const { t } = useTranslation('orientation')
  const toast = useToast()
  const nudge = useDownloadNudge()
  const [format, setFormat] = useState<ExportFormat>('image')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<{ output: FlowOutput; notes: FlowNote[] } | null>(null)

  const build = async (): Promise<ExportResult | null> => {
    setBusy(true)
    onBusy(true)
    try {
      const result = await onBuild(format)
      setLast(result)
      return result
    } catch (error) {
      toast.error(describeError(error, t('export.buildFailed')).message)
      return null
    } finally {
      setBusy(false)
      onBusy(false)
    }
  }

  const save = async () => {
    const result = await build()
    if (!result) return
    downloadOutput(result.output)
    nudge.onDownloaded()
  }

  const share = async () => {
    if (!last) return
    try {
      await shareOutput(last.output)
    } catch {
      toast.error(t('export.shareFailed'))
    }
  }

  return (
    <ToolPanel title={t('export.title')}>
      <FlowChoice<ExportFormat>
        legend={t('export.legend')}
        value={format}
        options={[
          { value: 'image', label: t('export.image'), hint: t(`export.imageHint.${sourceKind}`) },
          { value: 'pdf', label: t('export.pdf'), hint: t(sourceKind === 'pdf' ? 'export.pdfHintVector' : 'export.pdfHintPage') },
        ]}
        onChange={(next) => {
          setFormat(next)
          setLast(null)
        }}
      />

      {blocked ? <p className="erp-orient-muted">{blocked}</p> : null}

      <div className="erp-orient-actions">
        <Button variant="primary" className="erp-flow__run" disabled={disabled || busy || blocked !== null} onClick={() => void save()}>
          <Icon name={busy ? 'hourglass-split' : 'download'} className="me-2" />
          {t(busy ? 'export.building' : format === 'pdf' ? 'export.savePdf' : 'export.saveImage')}
        </Button>
        {last && canShare(last.output) ? (
          <Button variant="outline-secondary" disabled={busy} onClick={() => void share()}>
            <Icon name="share" className="me-2" />
            {t('export.share')}
          </Button>
        ) : null}
      </div>

      {last ? (
        <ul className="erp-orient-notes">
          <li className="erp-orient-note erp-orient-note--success">
            <Icon name="check-circle" />
            {last.output.detail ? t('export.savedDetail', { name: last.output.name, detail: last.output.detail }) : t('export.saved', { name: last.output.name })}
          </li>
          {last.notes.map((note) => (
            <li key={note.text} className={`erp-orient-note erp-orient-note--${note.tone}`}>
              <Icon name={TONE_ICON[note.tone]} />
              {note.text}
            </li>
          ))}
        </ul>
      ) : null}
      {nudge.extra}
    </ToolPanel>
  )
}
