import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import type { EmergencyContact, FamilySpace, PendingSos } from '../core/family'

interface Props { space: FamilySpace; onAddContact: (contact: EmergencyContact) => Promise<void>; onSos: (sos: PendingSos) => Promise<void>; onSafe: (id: string) => Promise<void>; onLocation: (id: string, location: NonNullable<PendingSos['lastKnown']>) => Promise<void>; disabled: boolean }

export function FamilySafety({ space, onAddContact, onSos, onSafe, onLocation, disabled }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const pending = space.sosQueue.filter((item) => item.status === 'PENDING_LOCAL')
  const addContact = async () => {
    if (!name.trim() || !/^[+0-9().\s-]{3,30}$/.test(phone)) { setError('Nhập tên và số điện thoại hợp lệ.'); return }
    try { await onAddContact({ id: crypto.randomUUID(), name: name.trim(), phone: phone.trim() }); setName(''); setPhone(''); setError('') }
    catch { setError('Không lưu được liên hệ.') }
  }
  const saveSos = async () => {
    try { await onSos({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'PENDING_LOCAL' }); setError('') }
    catch { setError('Không lưu được tín hiệu SOS trên thiết bị.') }
  }
  const locate = (id: string) => {
    if (!navigator.geolocation) { setError('Thiết bị không hỗ trợ vị trí.'); return }
    navigator.geolocation.getCurrentPosition(
      (position) => { void onLocation(id, { latitude: position.coords.latitude, longitude: position.coords.longitude, capturedAt: new Date().toISOString() }).catch(() => setError('Không lưu được vị trí.')) },
      () => setError('Không lấy được vị trí. Tín hiệu SOS đã lưu vẫn còn.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">An toàn gia đình</h2>
    <p>Chế độ hiện tại chỉ lưu trên thiết bị. Tín hiệu SOS ở đây <strong>chưa được gửi cho người thân</strong>. Khi cần trợ giúp, hãy gọi trực tiếp số khẩn cấp hoặc liên hệ đã lưu.</p>
    <div className="erp-tool-form__grid"><label className="erp-flow-field__label">Tên liên hệ khẩn cấp<Form.Control maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="erp-flow-field__label">Số điện thoại<Form.Control type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>
    <Button className="mt-3" variant="outline-secondary" disabled={disabled} onClick={() => void addContact()}>Lưu liên hệ</Button>
    {space.emergencyContacts.length ? <ul className="mt-3">{space.emergencyContacts.map((contact) => <li key={contact.id}>{contact.name}: <a href={`tel:${contact.phone.replace(/[^+0-9]/g, '')}`}>{contact.phone}</a></li>)}</ul> : null}
    <div className="d-flex flex-wrap gap-2 mt-3"><Button variant="outline-danger" disabled={disabled} onClick={() => void saveSos()}>Lưu tín hiệu SOS trên thiết bị</Button><a className="btn btn-danger" href="tel:113">Gọi 113</a><a className="btn btn-outline-danger" href="tel:115">Gọi 115</a></div>
    {pending.length ? <div className="mt-3"><h3 className="h6">Tín hiệu đang lưu cục bộ</h3>{pending.map((sos) => <div key={sos.id} className="border rounded p-3 mb-2"><p>{new Date(sos.createdAt).toLocaleString('vi-VN')} · Chưa gửi qua mạng</p>{sos.lastKnown ? <p>Vị trí cuối: {sos.lastKnown.latitude.toFixed(5)}, {sos.lastKnown.longitude.toFixed(5)} lúc {new Date(sos.lastKnown.capturedAt).toLocaleString('vi-VN')}</p> : null}<div className="d-flex flex-wrap gap-2"><Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => locate(sos.id)}>Lấy vị trí một lần</Button><Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => void onSafe(sos.id)}>Tôi an toàn</Button></div></div>)}</div> : null}
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
