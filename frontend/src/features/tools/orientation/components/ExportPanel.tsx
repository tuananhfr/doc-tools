import { useState } from 'react'
import { Button } from 'react-bootstrap'
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

const IMAGE_HINT: Record<ExportPanelProps['sourceKind'], string> = {
  image: 'Giữ nguyên thông tin chụp (EXIF) của ảnh gốc',
  pdf: 'Trang bản vẽ được vẽ lại thành ảnh PNG',
  none: 'Ảnh la bàn kèm số đo',
}

/** Lưu ảnh / PDF có la bàn + chú thích số đo — tệp mới, tệp gốc không bị sửa. */
export function ExportPanel({ blocked, sourceKind, disabled, onBuild, onBusy }: ExportPanelProps) {
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
      toast.error(describeError(error, 'Không dựng được tệp kết quả.').message)
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
      toast.error('Không chia sẻ được. Hãy lưu tệp rồi gửi.')
    }
  }

  return (
    <ToolPanel title="Lưu kết quả">
      <FlowChoice<ExportFormat>
        legend="Lưu thành"
        value={format}
        options={[
          { value: 'image', label: 'Ảnh', hint: IMAGE_HINT[sourceKind] },
          { value: 'pdf', label: 'PDF', hint: sourceKind === 'pdf' ? 'Giữ trang bản vẽ gốc dạng vector' : 'Một trang, in được' },
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
          {busy ? 'Đang dựng tệp…' : format === 'pdf' ? 'Lưu PDF' : 'Lưu ảnh'}
        </Button>
        {last && canShare(last.output) ? (
          <Button variant="outline-secondary" disabled={busy} onClick={() => void share()}>
            <Icon name="share" className="me-2" />
            Chia sẻ
          </Button>
        ) : null}
      </div>

      {last ? (
        <ul className="erp-orient-notes">
          <li className="erp-orient-note erp-orient-note--success">
            <Icon name="check-circle" />
            Đã lưu {last.output.name}
            {last.output.detail ? ` · ${last.output.detail}` : ''}
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
