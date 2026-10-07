import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import type { EmergencyContact, FamilySpace, PendingSos } from '../core/family'
import { intlLocale } from '@/i18n/intl'

interface Props { space: FamilySpace; onAddContact: (contact: EmergencyContact) => Promise<void>; onSos: (sos: PendingSos) => Promise<void>; onSafe: (id: string) => Promise<void>; onLocation: (id: string, location: NonNullable<PendingSos['lastKnown']>) => Promise<void>; disabled: boolean }

export function FamilySafety({ space, onAddContact, onSos, onSafe, onLocation, disabled }: Props) {
  const { t } = useTranslation('family')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const pending = space.sosQueue.filter((item) => item.status === 'PENDING_LOCAL')
  const addContact = async () => {
    if (!name.trim() || !/^[+0-9().\s-]{3,30}$/.test(phone)) { setError(t('safety.invalidContact')); return }
    try { await onAddContact({ id: crypto.randomUUID(), name: name.trim(), phone: phone.trim() }); setName(''); setPhone(''); setError('') }
    catch { setError(t('safety.contactFailed')) }
  }
  const saveSos = async () => {
    try { await onSos({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'PENDING_LOCAL' }); setError('') }
    catch { setError(t('safety.sosFailed')) }
  }
  const locate = (id: string) => {
    if (!navigator.geolocation) { setError(t('safety.noGeolocation')); return }
    navigator.geolocation.getCurrentPosition(
      (position) => { void onLocation(id, { latitude: position.coords.latitude, longitude: position.coords.longitude, capturedAt: new Date().toISOString() }).catch(() => setError(t('safety.locationSaveFailed'))) },
      () => setError(t('safety.locateFailed')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">{t('safety.title')}</h2>
    <p><Trans ns="family" i18nKey="safety.intro" components={{ strong: <strong /> }} /></p>
    <div className="erp-tool-form__grid"><label className="erp-flow-field__label">{t('safety.contactName')}<Form.Control maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="erp-flow-field__label">{t('shared.phone')}<Form.Control type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>
    <Button className="mt-3" variant="outline-secondary" disabled={disabled} onClick={() => void addContact()}>{t('safety.saveContact')}</Button>
    {space.emergencyContacts.length ? <ul className="mt-3">{space.emergencyContacts.map((contact) => <li key={contact.id}>{contact.name}: <a href={`tel:${contact.phone.replace(/[^+0-9]/g, '')}`}>{contact.phone}</a></li>)}</ul> : null}
    <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-danger" disabled={disabled} onClick={() => void saveSos()}>{t('safety.saveSos')}</Button><a className="btn btn-danger" href="tel:113">{t('safety.call', { number: 113 })}</a><a className="btn btn-outline-danger" href="tel:115">{t('safety.call', { number: 115 })}</a></div>
    {pending.length ? <div className="mt-3"><h3 className="h6">{t('safety.pendingTitle')}</h3>{pending.map((sos) => <div key={sos.id} className="border rounded p-3 mb-2"><p>{t('safety.notSent', { time: new Date(sos.createdAt).toLocaleString(intlLocale()) })}</p>{sos.lastKnown ? <p>{t('safety.lastLocation', { latitude: sos.lastKnown.latitude.toFixed(5), longitude: sos.lastKnown.longitude.toFixed(5), time: new Date(sos.lastKnown.capturedAt).toLocaleString(intlLocale()) })}</p> : null}<div className="d-flex flex-wrap gap-2"><Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => locate(sos.id)}>{t('safety.locateOnce')}</Button><Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => void onSafe(sos.id)}>{t('safety.imSafe')}</Button></div></div>)}</div> : null}
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
