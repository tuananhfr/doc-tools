import { TextDocumentStudio } from '@/features/tools/documents/components/TextDocumentStudio'
import { useDeferredValue, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolBoard, ToolLeaveGuard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { textStats, type TextStats } from '../utils/text-stats'

const ROWS: { key: keyof TextStats; label: ParseKeys<'utility'>; hint?: ParseKeys<'utility'> }[] = [
  { key: 'characters', label: 'charCount.rows.characters', hint: 'charCount.hints.characters' },
  { key: 'charactersNoSpaces', label: 'charCount.rows.charactersNoSpaces' },
  { key: 'words', label: 'charCount.rows.words', hint: 'charCount.hints.words' },
  { key: 'lines', label: 'charCount.rows.lines' },
  { key: 'paragraphs', label: 'charCount.rows.paragraphs', hint: 'charCount.hints.paragraphs' },
]

/** ĐẾM KÝ TỰ — chữ, từ, dòng, đoạn của đoạn văn dán vào; đếm ngay trên máy, không gửi chữ đi đâu. */
export default function CharCountPage() {
  const { t } = useTranslation('utility')
  const { t: common } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.charCount' })
  const id = useId()
  const [text, setText] = useState('')
  // Văn bản vài trăm nghìn chữ: đếm trễ một nhịp để ô gõ không khựng.
  const deferred = useDeferredValue(text)
  const stats = useMemo(() => textStats(deferred), [deferred])

  return (
    <TextDocumentStudio kind="count"><ToolLeaveGuard active={text !== ''} message={common('workspace.unsaved')} /><ToolBoard className="cn-charcount-workspace" layout="balanced"
      sideLabel={t('charCount.counts')}
      side={
        <>
          <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="123" /></span><div><h2>2. {t('charCount.counts')}</h2><p>{studio('resultHint')}</p></div></div>
          <dl className="erp-tool-stats" aria-live="polite">
            {ROWS.map((row) => (
              <div key={row.key} className="erp-tool-stat">
                <dt className="erp-tool-stat__label">
                  {t(row.label)}
                  {row.hint ? <span className="erp-tool-stat__hint">{t(row.hint)}</span> : null}
                </dt>
                <dd className="erp-tool-stat__value">{formatNumber(stats[row.key])}</dd>
              </div>
            ))}
          </dl>
        </>
      }
    >
      <ToolPanel
        title={`1. ${t('charCount.panelTitle')}`}
        actions={
          <Button variant="link" size="sm" className="erp-flow-files__clear" disabled={text === ''} onClick={() => { if (window.confirm(t('charCount.confirmClear'))) setText('') }}>
            <Icon name="x-lg" className="me-2" />
            {t('charCount.clear')}
          </Button>
        }
      >
        <p className="cn-studio-form-hint">{studio('inputHint')}</p>
        <label className="visually-hidden" htmlFor={id}>
          {t('charCount.textLabel')}
        </label>
        <Form.Control id={id} as="textarea" rows={14} className="erp-tool-textarea erp-tool-textarea--count" placeholder={t('charCount.placeholder')} value={text} onChange={(event) => setText(event.target.value)} />
      </ToolPanel>
    </ToolBoard></TextDocumentStudio>
  )
}
