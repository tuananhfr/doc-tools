import { parseCvDraft, type CvDraft } from '../models/cv'

export const CV_DRAFT_KEY = 'chuyen-nho-cv-draft-v1'
export const CV_REMEMBER_KEY = 'chuyen-nho-cv-remember-v1'
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function readCvStorage(storage: DraftStorage): { draft: CvDraft | null; remember: boolean; unreadable: boolean } {
  try {
    const raw = storage.getItem(CV_DRAFT_KEY)
    const draft = raw ? parseCvDraft(JSON.parse(raw)) : null
    return { draft, remember: storage.getItem(CV_REMEMBER_KEY) === '1', unreadable: Boolean(raw && !draft) }
  } catch { return { draft: null, remember: false, unreadable: true } }
}

export function hasCvContent(draft: CvDraft): boolean {
  const { template, experience, education, ...fields } = draft
  return Object.values(fields).some(value => value.trim().length > 0) || [...experience, ...education].some(entry => Object.values(entry).some(value => value.trim().length > 0))
}

export function storeCvDraft(storage: DraftStorage, draft: CvDraft, remember: boolean): void {
  if (!remember) return
  storage.setItem(CV_REMEMBER_KEY, '1')
  if (hasCvContent(draft)) storage.setItem(CV_DRAFT_KEY, JSON.stringify(draft))
  else storage.removeItem(CV_DRAFT_KEY)
}

export function forgetCvDraft(storage: DraftStorage): void {
  storage.removeItem(CV_DRAFT_KEY)
  storage.removeItem(CV_REMEMBER_KEY)
}
