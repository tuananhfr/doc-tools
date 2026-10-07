import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'
import { SAVED_PAGE_PATH } from '../config/cloud-routes'
import { useSaveResult, useSavedItems, useUpdateSaved } from '../hooks/useSavedItems'
import { CloudError, cloudService } from '../services/cloud.service'
import type { CloudErrorCode, SaveAdapter } from '../types/cloud.types'
import { savedStamp as stamp } from '../utils/saved-format'

interface Member { signedIn: boolean; pro: boolean }

type Notice = { tone: 'ok' | 'error'; text: string }

const codeOf = (error: unknown): CloudErrorCode => error instanceof CloudError ? error.code : 'UNKNOWN'

/**
 * Save / reopen a tool's input on the account. Guests and free accounts see nothing, so the Free
 * page and its "stays on your device" promise are unchanged; a lapsed Pro can still reopen.
 * `?saved=<id>` (the link from the saved page) opens that item once, then leaves the URL.
 */
export function SaveResultBar({ member, toolId, adapter }: { member: Member | null; toolId: string; adapter: SaveAdapter }) {
  const { t } = useTranslation('cloud')
  const toolName = findToolBySlug(toolId, useToolCatalog())?.name ?? toolId
  const titleId = useId()
  const [params, setParams] = useSearchParams()
  const signedIn = Boolean(member?.signedIn)
  const saved = useSavedItems(signedIn)
  const create = useSaveResult()
  const update = useUpdateSaved()
  const [opened, setOpened] = useState<{ id: string; title: string; rev: number } | null>(null)
  const [naming, setNaming] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(false)
  // The adapter closes over the page's latest state; the deep-link effect must not re-run on every keystroke.
  const adapterRef = useRef(adapter)
  adapterRef.current = adapter

  const mine = (saved.data?.items ?? []).filter((item) => item.kind === 'result' && item.toolId === toolId)
  const writable = Boolean(member?.pro && saved.data?.writable)
  const busy = loading || create.isPending || update.isPending

  const open = async (id: string) => {
    setLoading(true)
    setNotice(null)
    try {
      const item = await cloudService.get(id)
      if (item.toolId !== toolId || !adapterRef.current.restore(item.payload)) { setNotice({ tone: 'error', text: t('bar.restoreFailed') }); return }
      setOpened({ id: item.id, title: item.title, rev: item.rev })
      setNaming(null)
      setNotice({ tone: 'ok', text: t('bar.opened', { title: item.title }) })
    } catch (error) {
      setNotice({ tone: 'error', text: t(`errors.${codeOf(error)}`) })
    } finally {
      setLoading(false)
    }
  }

  const deepLink = signedIn ? params.get('saved') : null
  useEffect(() => {
    if (!deepLink) return
    setParams((current) => { const next = new URLSearchParams(current); next.delete('saved'); return next }, { replace: true })
    void open(deepLink)
    // Keyed on the link alone: `open` is a fresh closure each render and would reopen the item.
  }, [deepLink])

  if (!signedIn || !saved.data || (!writable && !mine.length)) return null

  const startNaming = () => {
    setNotice(null)
    setNaming(t('bar.defaultTitle', { tool: toolName, date: stamp(Math.floor(Date.now() / 1000)) }))
  }

  const saveNew = (event: FormEvent) => {
    event.preventDefault()
    const payload = adapter.snapshot()
    const title = naming?.trim()
    if (!payload || !title) return
    create.mutate({ toolId, title, payload }, {
      onSuccess: (item) => { setOpened({ id: item.id, title: item.title, rev: item.rev }); setNaming(null); setNotice({ tone: 'ok', text: t('bar.saved', { title: item.title }) }) },
      onError: (error) => setNotice({ tone: 'error', text: t(`errors.${codeOf(error)}`) }),
    })
  }

  const overwrite = (force = false) => {
    const payload = adapter.snapshot()
    if (!opened || !payload) return
    update.mutate({ id: opened.id, payload, baseRev: opened.rev, force }, {
      onSuccess: (item) => { setOpened({ id: item.id, title: item.title, rev: item.rev }); setNotice({ tone: 'ok', text: t('bar.updated', { title: item.title }) }) },
      onError: (error) => {
        // Another device wrote since this one opened it: the person decides, nothing is overwritten silently.
        if (error instanceof CloudError && error.code === 'SAVED_CONFLICT' && error.current) {
          if (window.confirm(t('bar.conflict', { title: error.current.title, date: stamp(error.current.updatedAt) }))) overwrite(true)
          return
        }
        if (codeOf(error) === 'NOT_FOUND') setOpened(null)
        setNotice({ tone: 'error', text: t(`errors.${codeOf(error)}`) })
      },
    })
  }

  const hasInput = adapter.snapshot() !== null

  return (
    <section className="cn-saved-bar" aria-labelledby={titleId}>
      <header className="cn-saved-bar__head">
        <span className="cn-saved-bar__icon"><Icon name="cloud-check" /></span>
        <div>
          <h2 id={titleId}>{t('bar.title')} <span className="cn-pro-chip">Pro</span></h2>
          <p>{writable ? t('bar.text') : t('bar.readOnly')}</p>
        </div>
      </header>

      <div className="cn-saved-bar__row">
        {mine.length ? (
          <label className="cn-saved-bar__open">
            <span>{t('bar.openLabel')}</span>
            <select className="form-select" value="" disabled={busy} onChange={(event) => { if (event.target.value) void open(event.target.value) }}>
              <option value="">{t('bar.openPlaceholder', { total: mine.length })}</option>
              {mine.map((item) => <option key={item.id} value={item.id}>{item.title} · {stamp(item.updatedAt)}</option>)}
            </select>
          </label>
        ) : null}
        {writable && naming === null ? (
          <div className="cn-saved-bar__actions">
            {opened ? (
              <button type="button" className="cn-button cn-button--ghost" disabled={busy || !hasInput} onClick={() => overwrite()}>
                <Icon name="arrow-repeat" />{t('bar.overwrite')}
              </button>
            ) : null}
            <button type="button" className="cn-button" disabled={busy || !hasInput} onClick={startNaming}>
              <Icon name="cloud-arrow-up" />{opened ? t('bar.saveCopy') : t('bar.save')}
            </button>
          </div>
        ) : null}
      </div>

      {writable && naming !== null ? (
        <form className="cn-saved-bar__name" onSubmit={saveNew}>
          <label>
            <span>{t('bar.nameLabel')}</span>
            <input className="form-control" value={naming} maxLength={120} autoFocus onChange={(event) => setNaming(event.target.value)} />
          </label>
          <div className="cn-saved-bar__actions">
            <button type="button" className="cn-button cn-button--ghost" onClick={() => setNaming(null)}>{t('bar.cancel')}</button>
            <button type="submit" className="cn-button" disabled={busy || !naming.trim()}><Icon name="check2" />{create.isPending ? t('bar.saving') : t('bar.confirm')}</button>
          </div>
        </form>
      ) : null}

      <div className="cn-saved-bar__foot" aria-live="polite">
        {notice ? (
          <p className={notice.tone === 'ok' ? 'cn-form-notice' : 'cn-form-error'} role={notice.tone === 'error' ? 'alert' : undefined}>
            <Icon name={notice.tone === 'ok' ? 'check-circle' : 'exclamation-circle'} />{notice.text}
          </p>
        ) : opened ? <p className="cn-saved-bar__current"><Icon name="file-earmark-check" />{t('bar.current', { title: opened.title })}</p> : null}
        <Link className="cn-saved-bar__all" to={SAVED_PAGE_PATH}>{t('bar.all')}<Icon name="arrow-right" /></Link>
      </div>
    </section>
  )
}
