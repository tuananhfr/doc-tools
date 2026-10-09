import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import type { LandingDoc } from '@/features/site-landing'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { LANDING_DELAY_NOTE } from '../../config/landing-form'
import { usePublishLanding, useSaveLanding, useUnpublishLanding } from '../../hooks/useLandings'
import { AdminError } from '../../services/admin.service'
import type { LandingDetail } from '../../types/admin.types'
import { formatDateTime } from '../../utils/admin-format'
import { landingPublicUrl } from '../../utils/landing-url'
import { ErrorText, Pill } from '../AdminKit'
import { LandingEditorForm } from './LandingEditorForm'
import { LandingFieldError } from './LandingFields'
import { LandingPreview } from './LandingPreview'

interface LandingEditorProps {
  detail: LandingDetail
  /** Fetches the latest saved page, dropping local edits; used after someone else saved first. */
  onReload: () => Promise<LandingDetail | undefined>
}

export function LandingEditor({ detail, onReload }: LandingEditorProps) {
  const toast = useToast()
  const catalog = useToolCatalog()
  const readyTools = useMemo(() => catalog.filter((tool) => tool.status === 'ready').sort((a, b) => a.name.localeCompare(b.name, 'vi')), [catalog])
  const [doc, setDoc] = useState<LandingDoc>(detail.draft)
  const [name, setName] = useState(detail.name)
  const [pane, setPane] = useState<'form' | 'preview'>('form')
  const save = useSaveLanding(detail.key)
  const publish = usePublishLanding(detail.key)
  const unpublish = useUnpublishLanding(detail.key)
  const busy = save.isPending || publish.isPending || unpublish.isPending
  const dirty = name !== detail.name || JSON.stringify(doc) !== JSON.stringify(detail.draft)

  const failure = save.error ?? publish.error
  const fieldError = failure instanceof AdminError && failure.field ? { field: failure.field, message: failure.message } : null
  const conflict = failure instanceof AdminError && failure.code === 'LANDING_CONFLICT' ? failure.message : null

  // Each failed attempt jumps to the field the server named, even when it is the same field as last time.
  useEffect(() => {
    if (!(failure instanceof AdminError) || !failure.field) return
    setPane('form')
    document.querySelector<HTMLElement>(`[name="${CSS.escape(failure.field)}"]`)?.focus()
  }, [failure])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Bản nháp chưa lưu sẽ mất. Vẫn rời trang?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  // The server tidies text (collapses spaces), so the editor continues from what was actually stored.
  const adopt = (landing: LandingDetail) => { setDoc(landing.draft); setName(landing.name) }
  const saveDraft = () => save.mutate({ name, draft: doc, baseRev: detail.rev }, { onSuccess: (landing) => { adopt(landing); toast.success('Đã lưu bản nháp.') } })
  const publishDraft = () => publish.mutate(detail.rev, { onSuccess: () => toast.success('Đã xuất bản. ' + LANDING_DELAY_NOTE) })
  const unpublishPage = () => {
    if (window.confirm('Gỡ xuất bản? Đường dẫn trên website gắn trang sẽ báo không tìm thấy trang.')) unpublish.mutate(undefined, { onSuccess: () => toast.success('Đã gỡ xuất bản.') })
  }
  const reload = async () => {
    const fresh = await onReload()
    if (!fresh) return
    adopt(fresh)
    save.reset()
    publish.reset()
  }

  const status = !detail.published
    ? <Pill tone="neutral" icon="file-earmark">Chưa xuất bản</Pill>
    : detail.unpublishedChanges
      ? <Pill tone="warning" icon="pencil-square">Có thay đổi chưa xuất bản</Pill>
      : <Pill tone="positive" icon="check2-circle">Đang xuất bản</Pill>

  return (
    <div className="cn-admin-leditor" data-pane={pane}>
      <div className="cn-admin-panel cn-admin-lbar">
        <div className="cn-admin-lbar__state">
          {status}
          {dirty ? <Pill tone="info" icon="dot">Có sửa chưa lưu</Pill> : null}
          <span className="cn-admin-sub">
            Lưu lúc {formatDateTime(detail.updatedAt)} bởi {detail.updatedBy}
            {detail.publishedAt ? ` · xuất bản lúc ${formatDateTime(detail.publishedAt)}` : ''}
          </span>
        </div>
        <div className="cn-admin-form__actions">
          <button type="button" className="cn-admin-button is-ghost" disabled={busy || !dirty} onClick={saveDraft}><Icon name="floppy" />Lưu bản nháp</button>
          <button type="button" className="cn-admin-button" disabled={busy || dirty || (detail.published && !detail.unpublishedChanges)} title={dirty ? 'Lưu bản nháp trước khi xuất bản' : undefined} onClick={publishDraft}><Icon name="send" />Xuất bản</button>
          {detail.published ? <a className="cn-admin-button is-ghost" href={landingPublicUrl(detail.key)} target="_blank" rel="noreferrer"><Icon name="box-arrow-up-right" />Mở trang thật</a> : null}
          {detail.published ? <button type="button" className="cn-admin-button is-danger-ghost" disabled={busy} onClick={unpublishPage}>Gỡ xuất bản</button> : null}
        </div>
        {conflict ? (
          <div className="cn-admin-alert is-danger" role="alert">
            <Icon name="exclamation-triangle" />
            <span>{conflict} Bản bạn đang sửa sẽ bị thay.</span>
            <button type="button" className="cn-admin-button is-ghost" onClick={() => void reload()}>Tải bản mới nhất</button>
          </div>
        ) : fieldError ? null : <ErrorText error={failure ?? unpublish.error} />}
        {fieldError ? <p className="cn-admin-error" role="alert"><Icon name="exclamation-circle" />Chưa lưu được: {fieldError.message} Ô có lỗi đã được đánh dấu.</p> : null}
      </div>

      <div className="cn-admin-tabs cn-admin-leditor__switch" role="group" aria-label="Chế độ xem">
        <button type="button" className={pane === 'form' ? 'is-active' : ''} aria-pressed={pane === 'form'} onClick={() => setPane('form')}><Icon name="pencil" /> Nội dung</button>
        <button type="button" className={pane === 'preview' ? 'is-active' : ''} aria-pressed={pane === 'preview'} onClick={() => setPane('preview')}><Icon name="eye" /> Xem trước</button>
      </div>

      <div className="cn-admin-leditor__panes">
        <LandingFieldError.Provider value={fieldError}>
          <div className="cn-admin-leditor__form">
            <LandingEditorForm doc={doc} name={name} readyTools={readyTools} onChange={setDoc} onNameChange={setName} />
          </div>
        </LandingFieldError.Provider>
        <div className="cn-admin-leditor__preview">
          <LandingPreview doc={doc} landingKey={detail.key} catalog={catalog} />
        </div>
      </div>
    </div>
  )
}
