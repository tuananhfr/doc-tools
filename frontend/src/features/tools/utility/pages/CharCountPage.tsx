import { useDeferredValue, useId, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { textStats, type TextStats } from '../utils/text-stats'

const ROWS: { key: keyof TextStats; label: string; hint?: string }[] = [
  { key: 'characters', label: 'Ký tự', hint: 'tính cả khoảng trắng và xuống dòng' },
  { key: 'charactersNoSpaces', label: 'Ký tự không tính khoảng trắng' },
  { key: 'words', label: 'Từ', hint: 'cụm chữ cách nhau bằng khoảng trắng' },
  { key: 'lines', label: 'Dòng' },
  { key: 'paragraphs', label: 'Đoạn', hint: 'cách nhau bằng dòng trống' },
]

/** ĐẾM KÝ TỰ — chữ, từ, dòng, đoạn của đoạn văn dán vào; đếm ngay trên máy, không gửi chữ đi đâu. */
export default function CharCountPage() {
  const id = useId()
  const [text, setText] = useState('')
  // Văn bản vài trăm nghìn chữ: đếm trễ một nhịp để ô gõ không khựng.
  const deferred = useDeferredValue(text)
  const stats = useMemo(() => textStats(deferred), [deferred])

  return (
    <ToolBoard
      sideLabel="Số đếm"
      side={
        <>
          <h2 className="erp-flow-options__title">Số đếm</h2>
          <dl className="erp-tool-stats" aria-live="polite">
            {ROWS.map((row) => (
              <div key={row.key} className="erp-tool-stat">
                <dt className="erp-tool-stat__label">
                  {row.label}
                  {row.hint ? <span className="erp-tool-stat__hint">{row.hint}</span> : null}
                </dt>
                <dd className="erp-tool-stat__value">{formatNumber(stats[row.key])}</dd>
              </div>
            ))}
          </dl>
        </>
      }
    >
      <ToolPanel
        title="Văn bản"
        actions={
          <Button variant="link" size="sm" className="erp-flow-files__clear" disabled={text === ''} onClick={() => setText('')}>
            <Icon name="x-lg" className="me-2" />
            Xoá hết
          </Button>
        }
      >
        <label className="visually-hidden" htmlFor={id}>
          Văn bản cần đếm
        </label>
        <Form.Control id={id} as="textarea" rows={14} className="erp-tool-textarea erp-tool-textarea--count" placeholder="Gõ hoặc dán văn bản vào đây…" value={text} onChange={(event) => setText(event.target.value)} />
      </ToolPanel>
    </ToolBoard>
  )
}
