import { useEffect, useRef, useState } from 'react'
import type { CvTemplateId } from '../config/cv-templates'
import { emptyCv, type CvDraft } from '../models/cv'
import { withCvTemplate } from '../utils/template-switch'
import { forgetCvDraft, hasCvContent, readCvStorage, storeCvDraft } from '../services/cv-draft-storage'

export function useCvDraft() {
  const [draft, setDraft] = useState<CvDraft>(emptyCv)
  const [remember, setRemember] = useState(false)
  const [availableDraft, setAvailableDraft] = useState<CvDraft | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState('')
  const latest = useRef(draft)
  const [message, setMessage] = useState<'cv.messages.unreadable' | 'cv.messages.restored' | 'cv.messages.saved' | 'cv.messages.saveFailed' | 'cv.messages.cleared' | 'cv.messages.memoryOnly' | ''>('')
  useEffect(() => {
    try {
      const stored = readCvStorage(localStorage)
      if (stored.remember && !stored.unreadable) {
        setRemember(true)
        if (stored.draft) { latest.current = stored.draft; setDraft(stored.draft); setSaved(JSON.stringify(stored.draft)); setMessage('cv.messages.restored') }
      } else setAvailableDraft(stored.draft)
      if (stored.unreadable) setMessage('cv.messages.unreadable')
    } catch { setMessage('cv.messages.unreadable') }
    finally { setLoaded(true) }
  }, [])
  // Commit in the input event, so a reload cannot beat a delayed autosave.
  // Failed writes retain the input and leave the durable snapshot unchanged.
  const replace = (next: CvDraft) => {
    latest.current = next; setDraft(next)
    if (loaded && remember) {
      try { storeCvDraft(localStorage, next, true); setSaved(JSON.stringify(next)); setMessage('cv.messages.saved') }
      catch { setMessage('cv.messages.saveFailed') }
    }
  }
  const update = <K extends keyof CvDraft>(key: K, value: CvDraft[K]) => replace({ ...latest.current, [key]: value })
  const changeTemplate = (template: CvTemplateId) => replace(withCvTemplate(latest.current, template))
  const changeRemember = (next: boolean) => {
    try {
      if (next) storeCvDraft(localStorage, draft, true)
      else forgetCvDraft(localStorage)
      setRemember(next); setAvailableDraft(null); setSaved(next ? JSON.stringify(draft) : ''); setMessage(next ? 'cv.messages.saved' : 'cv.messages.memoryOnly')
    } catch { setMessage('cv.messages.saveFailed') }
  }
  const restore = () => {
    if (!availableDraft) return
    replace(availableDraft); setAvailableDraft(null); setMessage('cv.messages.restored')
  }
  const clear = () => {
    try { forgetCvDraft(localStorage) } catch { setMessage('cv.messages.saveFailed'); return false }
    const fresh = emptyCv(); latest.current = fresh; setDraft(fresh); setSaved(''); setRemember(false); setAvailableDraft(null); setMessage('cv.messages.cleared')
    return true
  }
  const unsaved = hasCvContent(draft) && (!remember || saved !== JSON.stringify(draft) || message === 'cv.messages.saveFailed')
  return { draft, update, replace, changeTemplate, remember, changeRemember, availableDraft, restore, clear, message, unsaved }
}
