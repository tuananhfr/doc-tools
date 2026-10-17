import { useEffect, useId, useState } from 'react'
import { Button, Form, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, type FlowOutput } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { PdfQuickStudio } from '../../components/quick/PdfQuickStudio'
import { protectPdf, removePdfPassword } from '../../services/pdf-password'

export default function PdfPasswordPage() {
  const { t } = useTranslation('pdf')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.password' })
  const { t: s } = useTranslation('pdf', { keyPrefix: 'workflowStudio' })
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
  const [error, setError] = useState('')
  const [result, setResult] = useState<FlowOutput | null>(null)
  const restricted = !printing || !copying || !modifying
  useEffect(() => { setError(''); setResult(null) }, [file, mode, password, repeat, owner, printing, copying, modifying])
  const run = async () => {
    if (!file || busy) return
    if (mode === 'protect' && password !== repeat) { setError(t('password.mismatch')); return }
    setBusy(true); setError(''); setResult(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const output = mode === 'protect'
        ? await protectPdf(bytes, password, owner, { printing, copying, modifying })
        : await removePdfPassword(bytes, password)
      const result = { name: `${file.name.replace(/\.pdf$/i, '')}-${mode === 'protect' ? 'co-mat-khau' : 'da-mo-khoa'}.pdf`, blob: new Blob([output], { type: 'application/pdf' }) }
      setResult(result); downloadOutput(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('password.failed')) }
    finally { setBusy(false) }
  }
  return <PdfQuickStudio kind="password"><div className="cn-passwordstudio">
    <section className="cn-idstudio-panel cn-passwordstudio-input"><h2>{s('passwordInput')}</h2>
      <div className="cn-convertstudio-upload"><FilePicker accept="application/pdf,.pdf" multiple={false} title={t('password.pickFile')} hint={studio('fileHint')} compact={Boolean(file)} loading={null} disabled={busy} onFiles={files => setFile(files[0] ?? null)} /></div>
      {file ? <div className="cn-passwordstudio-file"><Icon name="file-earmark-pdf" /><strong>{file.name}</strong><span>{formatFileSize(file.size)}</span></div> : null}
      <p className="cn-flowstudio-hint"><Icon name="shield-check" /> {t('password.privacy')}</p>
    </section>
    <section className="cn-idstudio-panel cn-passwordstudio-options"><h2>{s('passwordOptions')}</h2>
      <fieldset className="cn-password-fields" disabled={busy}><legend className="visually-hidden">{t('password.title')}</legend>
      <div className="cn-password-modes" role="group" aria-label={t('password.mode')}>{(['protect', 'remove'] as const).map(value => <button type="button" key={value} disabled={busy} aria-pressed={mode === value} onClick={() => setMode(value)}><Icon name={value === 'protect' ? 'lock' : 'unlock'} />{t(`password.${value}`)}</button>)}</div>
      <label className="erp-flow-field__label mt-3">{mode === 'protect' ? t('password.openPassword') : t('password.givenPassword')}<Form.Control type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} /></label>
      {mode === 'protect' ? <p className="cn-flowstudio-hint">{studio('passwordHint')}</p> : null}
      {mode === 'protect' ? <><label className="erp-flow-field__label mt-3">{t('password.repeat')}<Form.Control type="password" autoComplete="off" value={repeat} onChange={event => setRepeat(event.target.value)} /></label>
        <fieldset className="cn-password-permissions mt-3"><legend className="erp-flow-field__label">{t('password.permissions')}</legend><Form.Check id={`${ids}-print`} label={t('password.allowPrint')} checked={printing} onChange={event => setPrinting(event.target.checked)} /><Form.Check id={`${ids}-copy`} label={t('password.allowCopy')} checked={copying} onChange={event => setCopying(event.target.checked)} /><Form.Check id={`${ids}-modify`} label={t('password.allowModify')} checked={modifying} onChange={event => setModifying(event.target.checked)} /></fieldset>
        {restricted ? <label className="erp-flow-field__label mt-3">{t('password.ownerPassword')}<Form.Control type="password" autoComplete="off" value={owner} onChange={event => setOwner(event.target.value)} /></label> : null}
        <p className="cn-flowstudio-hint">{t('password.protectNote')}</p></> : <p className="cn-flowstudio-hint">{t('password.removeNote')}</p>}
      </fieldset>
      <Button className="cn-flowstudio-run" disabled={!file || busy} onClick={() => void run()}>{busy ? <Spinner size="sm" /> : <Icon name={mode === 'protect' ? 'lock' : 'unlock'} />}{busy ? t('password.busy') : mode === 'protect' ? t('password.protectRun') : t('password.removeRun')}</Button>
      {error ? <p className="cn-passwordstudio-error" role="alert">{error}</p> : null}
    </section>
    <section className="cn-idstudio-panel cn-passwordstudio-output"><h2>{s('passwordOutput')}</h2>
      <div className={`cn-passwordstudio-result${result ? ' is-done' : ''}`}><Icon name={busy ? 'hourglass-split' : result ? 'shield-check' : mode === 'protect' ? 'file-earmark-lock' : 'unlock'} /><strong role="status">{busy ? t('password.busy') : result ? t('password.done') : studio('resultEmpty')}</strong><p>{result?.name || file?.name || t('password.noFile')}</p>{result ? <span>{formatFileSize(result.blob.size)}</span> : null}</div>
      <Button variant="primary" className="cn-flowstudio-run" disabled={!result || busy} onClick={() => { if (result) downloadOutput(result) }}><Icon name="download" />{s('downloadAgain')}</Button>
      <p className="cn-flowstudio-hint">{s('passwordResultHint')}</p>
    </section>
  </div></PdfQuickStudio>
}
