import { describe, expect, it } from 'vitest'
import { emptyCv } from '../models/cv'
import { CV_DRAFT_KEY, CV_REMEMBER_KEY, forgetCvDraft, readCvStorage, storeCvDraft } from './cv-draft-storage'

function storage() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
describe('CV draft storage consent', () => {
  it('does not persist personal details before the user chooses to remember', () => {
    const local = storage(), draft = { ...emptyCv(), name: 'Nguyễn Kiểm Thử' }
    storeCvDraft(local, draft, false)
    expect(local.values.size).toBe(0)
    storeCvDraft(local, draft, true)
    expect(readCvStorage(local)).toMatchObject({ remember: true, draft, unreadable: false })
  })
  it('keeps legacy drafts available without interpreting them as consent', () => {
    const local = storage(), draft = { ...emptyCv(), name: 'Saved legacy name' }
    local.setItem(CV_DRAFT_KEY, JSON.stringify(draft))
    expect(readCvStorage(local)).toMatchObject({ remember: false, draft })
    expect(local.values.size).toBe(1)
    forgetCvDraft(local)
    expect(local.getItem(CV_DRAFT_KEY)).toBeNull()
    expect(local.getItem(CV_REMEMBER_KEY)).toBeNull()
  })
  it('reports corrupted or unavailable storage without losing the in-memory draft', () => {
    const local = storage(); local.setItem(CV_DRAFT_KEY, '{broken')
    expect(readCvStorage(local).unreadable).toBe(true)
    expect(readCvStorage({ ...local, getItem: () => { throw new Error('Blocked') } }).unreadable).toBe(true)
  })
})
