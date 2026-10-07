import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { FamilyMember, MemberProfile } from '../core/family'

interface Props { members: FamilyMember[]; onAdd: (member: FamilyMember) => Promise<void>; disabled: boolean }

export function FamilyMembers({ members, onAdd, disabled }: Props) {
  const { t } = useTranslation('family')
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<MemberProfile>('PARENT')
  const [error, setError] = useState('')
  const add = async () => {
    if (!name.trim() || members.length >= 100) return
    try { await onAdd({ id: crypto.randomUUID(), name: name.trim(), profile }); setName(''); setError('') }
    catch { setError(t('members.saveFailed')) }
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">{t('shared.members')}</h2>
    <p>{t('members.intro')}</p>
    <ul>{members.map((member) => <li key={member.id}>{member.name} · {t(`profiles.${member.profile}`)}</li>)}</ul>
    <div className="erp-tool-form__grid"><label className="erp-flow-field__label">{t('members.name')}<Form.Control maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="erp-flow-field__label">{t('members.profile')}<Form.Select value={profile} onChange={(event) => setProfile(event.target.value as MemberProfile)}><option value="PARENT">{t('profiles.PARENT')}</option><option value="SENIOR">{t('profiles.SENIOR')}</option><option value="CHILD">{t('profiles.CHILD')}</option></Form.Select></label></div>
    <Button className="mt-3" variant="outline-secondary" disabled={disabled || !name.trim() || members.length >= 100} onClick={() => void add()}>{t('members.add')}</Button>
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
