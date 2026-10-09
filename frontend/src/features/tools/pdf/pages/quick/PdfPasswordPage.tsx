import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { protectPdf, removePdfPassword } from '../../services/pdf-password'

export default function PdfPasswordPage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const [mode, setMode] = useState<'protect' | 'remove'>('protect')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [owner, setOwner] = useState('')
  const [printing, setPrinting] = useState(true)
  const [copying, setCopying] = useState(true)
  const [modifying, setModifying] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const restricted = !printing || !copying || !modifying
  const run = async () => {
    if (!file || busy) return
    if (mode === 'protect' && password !== repeat) { setMessage(t('password.mismatch')); return }
    setBusy(true)
    setMessage('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const output = mode === 'protect'
        ? await protectPdf(bytes, password, owner, { printing, copying, modifying })
        : await removePdfPassword(bytes, password)
      downloadOutput({ name: `${file.name.replace(/\.pdf$/i, '')}-${mode === 'protect' ? 'co-mat-khau' : 'da-mo-khoa'}.pdf`, blob: new Blob([output], { type: 'application/pdf' }) })
      setMessage(t('password.done'))
    } catch (error) { setMessage(error instanceof Error ? error.message : t('password.failed')) }
    finally { setBusy(false) }
  }
  return <ToolBoard side={<div className="erp-tool-result" role="status"><p className="erp-tool-result__label">{t('password.result')}</p><p className="erp-tool-result__value">{file?.name || t('password.noFile')}</p><p className="erp-tool-result__note">{message || t('password.privacy')}</p><Button disabled={!file || busy} onClick={() => void run()}>{busy ? t('password.busy') : mode === 'protect' ? t('password.protectRun') : t('password.removeRun')}</Button></div>}>
    <ToolPanel title={t('password.title')}>
      <Form.Select aria-label={t('password.mode')} value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setMessage('') }}><option value="protect">{t('password.protect')}</option><option value="remove">{t('password.remove')}</option></Form.Select>
      <label className="erp-flow-field__label mt-3">{t('password.pickFile')}<Form.Control type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile((event.target as HTMLInputElement).files?.[0] || null); setMessage('') }} /></label>
      <label className="erp-flow-field__label mt-3">{mode === 'protect' ? t('password.openPassword') : t('password.givenPassword')}<Form.Control type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {mode === 'protect' ? <><label className="erp-flow-field__label mt-3">{t('password.repeat')}<Form.Control type="password" autoComplete="off" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label>
        {/* Form.Check thiếu `id` thì nhãn không gắn với ô: bấm chữ không tích được, trình đọc màn hình đọc ô không tên. */}
        <fieldset className="mt-3"><legend className="erp-flow-field__label">{t('password.permissions')}</legend><Form.Check id={`${ids}-print`} label={t('password.allowPrint')} checked={printing} onChange={(event) => setPrinting(event.target.checked)} /><Form.Check id={`${ids}-copy`} label={t('password.allowCopy')} checked={copying} onChange={(event) => setCopying(event.target.checked)} /><Form.Check id={`${ids}-modify`} label={t('password.allowModify')} checked={modifying} onChange={(event) => setModifying(event.target.checked)} /></fieldset>
        {restricted ? <label className="erp-flow-field__label mt-3">{t('password.ownerPassword')}<Form.Control type="password" autoComplete="off" value={owner} onChange={(event) => setOwner(event.target.value)} /></label> : null}
        <p className="mt-3">{t('password.protectNote')}</p></> : <p className="mt-3">{t('password.removeNote')}</p>}
    </ToolPanel>
  </ToolBoard>
}
