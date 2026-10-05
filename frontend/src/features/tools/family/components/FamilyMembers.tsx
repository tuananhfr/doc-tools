import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import type { FamilyMember, MemberProfile } from '../core/family'

interface Props { members: FamilyMember[]; onAdd: (member: FamilyMember) => Promise<void>; disabled: boolean }

export function FamilyMembers({ members, onAdd, disabled }: Props) {
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<MemberProfile>('PARENT')
  const [error, setError] = useState('')
  const add = async () => {
    if (!name.trim() || members.length >= 100) return
    try { await onAdd({ id: crypto.randomUUID(), name: name.trim(), profile }); setName(''); setError('') }
    catch { setError('Không lưu được thành viên.') }
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">Thành viên</h2>
    <p>Đặt tên gọi dễ nhận biết. Không cần nhập ngày sinh, trường học hoặc giấy tờ cá nhân.</p>
    <ul>{members.map((member) => <li key={member.id}>{member.name} · {member.profile === 'PARENT' ? 'Bố mẹ' : member.profile === 'SENIOR' ? 'Ông bà' : 'Con'}</li>)}</ul>
    <div className="erp-tool-form__grid"><label className="erp-flow-field__label">Tên gọi<Form.Control maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="erp-flow-field__label">Hồ sơ<Form.Select value={profile} onChange={(event) => setProfile(event.target.value as MemberProfile)}><option value="PARENT">Bố mẹ</option><option value="SENIOR">Ông bà</option><option value="CHILD">Con</option></Form.Select></label></div>
    <Button className="mt-3" variant="outline-secondary" disabled={disabled || !name.trim() || members.length >= 100} onClick={() => void add()}>Thêm thành viên</Button>
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
