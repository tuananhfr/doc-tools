import { useEffect, useState } from 'react'
import { emptyCv, type CvDraft } from '../models/cv'
import { forgetCvDraft, readCvStorage, storeCvDraft } from '../services/cv-draft-storage'

export function useCvDraft() {
  const [draft, setDraft] = useState<CvDraft>(emptyCv)
  const [remember, setRemember] = useState(false)
  const [availableDraft, setAvailableDraft] = useState<CvDraft | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState<'cv.messages.unreadable' | 'cv.messages.restored' | 'cv.messages.saveFailed' | 'cv.messages.cleared' | 'cv.messages.memoryOnly' | ''>('')
  useEffect(() => {
    const stored = readCvStorage(localStorage)
    if (stored.remember && stored.draft) { setDraft(stored.draft); setRemember(true); setMessage('cv.messages.restored') }
    else setAvailableDraft(stored.draft)
    if (stored.unreadable) setMessage('cv.messages.unreadable')
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (!loaded || !remember) return
    const timer = window.setTimeout(() => { try { storeCvDraft(localStorage, draft, true) } catch { setMessage('cv.messages.saveFailed') } }, 400)
    return () => window.clearTimeout(timer)
  }, [draft, loaded, remember])
  const update = (key: keyof CvDraft, value: CvDraft[typeof key]) => setDraft(current => ({ ...current, [key]: value }))
  const changeRemember = (next: boolean) => {
    try {
      if (next) storeCvDraft(localStorage, draft, true)
      else forgetCvDraft(localStorage)
      setRemember(next); setAvailableDraft(null); setMessage(next ? '' : 'cv.messages.memoryOnly')
    } catch { setMessage('cv.messages.saveFailed') }
  }
  const restore = () => {
    if (!availableDraft) return
    setDraft(availableDraft); setAvailableDraft(null); setMessage('cv.messages.restored')
  }
  const clear = () => {
    try { forgetCvDraft(localStorage) } catch { setMessage('cv.messages.saveFailed'); return false }
    setDraft(emptyCv()); setRemember(false); setAvailableDraft(null); setMessage('cv.messages.cleared')
    return true
  }
  return { draft, update, remember, changeRemember, availableDraft, restore, clear, message }
}
