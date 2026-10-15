import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { protectPdf, removePdfPassword } from '../../services/pdf-password'

export default function PdfPasswordPage() {
  const { t } = useTranslation('pdf')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.password' })
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
  return <ToolBoard className="cn-password-workspace" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('stepChoose'), studio('stepPassword'), studio('stepSave')]} tip={studio('tip')} note={t('password.privacy')} /></div>} side={<div className="erp-tool-result cn-password-result">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name={mode === 'protect' ? 'shield-lock' : 'unlock'} /></span><div><h2>{t('password.result')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className={`cn-password-file${file ? ' cn-password-file--ready' : ''}`}><Icon name={file ? 'file-earmark-pdf' : 'file-earmark-lock'} /><p>{file?.name || t('password.noFile')}</p></div>
    <p className={message ? 'cn-password-message' : 'erp-tool-result__note'} role="status">{message || studio('resultEmpty')}</p>
    <Button className="cn-password-run" disabled={!file || busy} onClick={() => void run()}><Icon name={busy ? 'hourglass-split' : mode === 'protect' ? 'lock' : 'unlock'} className="me-2" />{busy ? t('password.busy') : mode === 'protect' ? t('password.protectRun') : t('password.removeRun')}</Button>
  </div>}>
    <ToolPanel title={studio('inputTitle')} actions={<span className="cn-studio-small-icon"><Icon name="file-earmark-pdf" /></span>}>
      <FilePicker accept="application/pdf,.pdf" multiple={false} title={t('password.pickFile')} hint={studio('fileHint')} compact={Boolean(file)} loading={null} disabled={busy} onFiles={files => { setFile(files[0] ?? null); setMessage('') }} />
    </ToolPanel>
    <ToolPanel title={t('password.title')} actions={<span className="cn-studio-small-icon"><Icon name="key" /></span>}>
      <fieldset className="cn-password-fields" disabled={busy}><legend className="visually-hidden">{t('password.title')}</legend>
      <div className="cn-password-modes" role="group" aria-label={t('password.mode')}>{(['protect', 'remove'] as const).map(value => <button type="button" key={value} disabled={busy} aria-pressed={mode === value} onClick={() => { setMode(value); setMessage('') }}><Icon name={value === 'protect' ? 'lock' : 'unlock'} />{t(`password.${value}`)}</button>)}</div>
      <label className="erp-flow-field__label mt-3">{mode === 'protect' ? t('password.openPassword') : t('password.givenPassword')}<Form.Control type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {mode === 'protect' ? <p className="cn-studio-form-hint mt-2 mb-0">{studio('passwordHint')}</p> : null}
      {mode === 'protect' ? <><label className="erp-flow-field__label mt-3">{t('password.repeat')}<Form.Control type="password" autoComplete="off" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label>
        {/* Form.Check thiếu `id` thì nhãn không gắn với ô: bấm chữ không tích được, trình đọc màn hình đọc ô không tên. */}
        <fieldset className="cn-password-permissions mt-3"><legend className="erp-flow-field__label">{t('password.permissions')}</legend><Form.Check id={`${ids}-print`} label={t('password.allowPrint')} checked={printing} onChange={(event) => setPrinting(event.target.checked)} /><Form.Check id={`${ids}-copy`} label={t('password.allowCopy')} checked={copying} onChange={(event) => setCopying(event.target.checked)} /><Form.Check id={`${ids}-modify`} label={t('password.allowModify')} checked={modifying} onChange={(event) => setModifying(event.target.checked)} /></fieldset>
        {restricted ? <label className="erp-flow-field__label mt-3">{t('password.ownerPassword')}<Form.Control type="password" autoComplete="off" value={owner} onChange={(event) => setOwner(event.target.value)} /></label> : null}
        <p className="mt-3">{t('password.protectNote')}</p></> : <p className="mt-3">{t('password.removeNote')}</p>}
      </fieldset>
    </ToolPanel>
  </ToolBoard>
}
