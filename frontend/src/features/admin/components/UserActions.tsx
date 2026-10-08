import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { adminService } from '../services/admin.service'
import { useDeleteUser, useUserAction } from '../hooks/useAdmin'
import type { UserDetail } from '../types/admin.types'
import { formatProEnd, vietnamDatePlus } from '../utils/admin-format'
import { ErrorText, Panel } from './AdminKit'
import { UserEmailForm } from './UserEmailForm'

type User = UserDetail['user']

export function ProActions({ user }: { user: User }) {
  const toast = useToast()
  // Grants keep the later end date, so an extension must default past the current one or it changes nothing.
  const [until, setUntil] = useState(() => vietnamDatePlus(30, user.proEndsAt ? (user.proEndsAt - 1) * 1000 : undefined))
  const [note, setNote] = useState('')
  const grant = useUserAction(user.id, () => adminService.grantPro(user.id, until, note.trim()))
  const revoke = useUserAction(user.id, () => adminService.revokePro(user.id, note.trim()))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    grant.mutate(undefined, { onSuccess: () => { toast.success(`Đã cấp Pro đến hết ${until.split('-').reverse().join('/')}.`); setNote('') } })
  }
  return (
    <Panel title="Gói Pro">
      <p className="cn-admin-lead">{user.proEndsAt ? <>Pro đến hết ngày <strong>{formatProEnd(user.proEndsAt)}</strong>. Cấp thêm sẽ lấy ngày muộn nhất.</> : 'Đang dùng gói miễn phí.'}</p>
      <form className="cn-admin-form" onSubmit={submit}>
        <div className="cn-admin-form__row">
          <label>Đến hết ngày<input type="date" required value={until} min={vietnamDatePlus(0)} onChange={(event) => setUntil(event.target.value)} /></label>
          <label className="is-grow">Ghi chú (hoá đơn, kênh liên hệ…)<input type="text" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
        <div className="cn-admin-form__actions">
          <button type="submit" className="cn-admin-button" disabled={grant.isPending}><Icon name="stars" />{user.proEndsAt ? 'Gia hạn Pro' : 'Cấp Pro'}</button>
          {user.proEndsAt ? (
            <button type="button" className="cn-admin-button is-danger-ghost" disabled={revoke.isPending} onClick={() => { if (window.confirm(`Thu hồi Pro của ${user.email} ngay bây giờ?`)) revoke.mutate(undefined, { onSuccess: () => toast.success('Đã thu hồi Pro.') }) }}>Thu hồi Pro</button>
          ) : null}
        </div>
        <ErrorText error={grant.error ?? revoke.error} />
      </form>
    </Panel>
  )
}

export function AccountActions({ user, onDeleted }: { user: User; onDeleted: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [name, setName] = useState(user.displayName ?? '')
  const [confirmEmail, setConfirmEmail] = useState('')
  const disable = useUserAction(user.id, () => adminService.disableUser(user.id, reason.trim()))
  const enable = useUserAction(user.id, () => adminService.enableUser(user.id))
  const endSessions = useUserAction(user.id, () => adminService.endSessions(user.id))
  const rename = useUserAction(user.id, () => adminService.updateProfile(user.id, name.trim(), user.publicAttribution))
  const remove = useDeleteUser()
  const error = disable.error ?? enable.error ?? endSessions.error ?? rename.error

  return (
    <Panel title="Tài khoản">
      <div className="cn-admin-actions">
        <form className="cn-admin-form" onSubmit={(event) => { event.preventDefault(); rename.mutate(undefined, { onSuccess: () => toast.success('Đã lưu tên hiển thị.') }) }}>
          <label>Tên hiển thị<input type="text" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Để trống = không có tên" /></label>
          <div className="cn-admin-form__actions"><button type="submit" className="cn-admin-button is-ghost" disabled={rename.isPending || name.trim() === (user.displayName ?? '')}>Lưu tên</button></div>
        </form>

        <UserEmailForm key={user.email} user={user} />

        {user.status === 'active' ? (
          <form className="cn-admin-form" onSubmit={(event) => { event.preventDefault(); disable.mutate(undefined, { onSuccess: () => { toast.success('Đã khoá tài khoản và đăng xuất mọi phiên.'); setReason('') } }) }}>
            <label>Lý do khoá (ghi vào nhật ký)<input type="text" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <div className="cn-admin-form__actions">
              <button type="submit" className="cn-admin-button is-danger-ghost" disabled={disable.isPending}><Icon name="lock" />Khoá tài khoản</button>
              <button type="button" className="cn-admin-button is-ghost" disabled={endSessions.isPending} onClick={() => endSessions.mutate(undefined, { onSuccess: () => toast.success('Đã đăng xuất mọi phiên.') })}><Icon name="box-arrow-right" />Đăng xuất mọi phiên</button>
            </div>
          </form>
        ) : (
          <div className="cn-admin-form">
            <p className="cn-admin-lead">Tài khoản đang khoá: không đăng nhập được, phiên cũ đã bị xoá.</p>
            <div className="cn-admin-form__actions"><button type="button" className="cn-admin-button" disabled={enable.isPending} onClick={() => enable.mutate(undefined, { onSuccess: () => toast.success('Đã mở khoá.') })}><Icon name="unlock" />Mở khoá</button></div>
          </div>
        )}
        <ErrorText error={error} />

        <form className="cn-admin-form is-danger-zone" onSubmit={(event) => { event.preventDefault(); remove.mutate({ id: user.id, confirmEmail: confirmEmail.trim() }, { onSuccess: () => { toast.success(`Đã xoá ${user.email}.`); onDeleted() } }) }}>
          <strong>Xoá tài khoản</strong>
          <p className="cn-admin-lead">Xoá hồ sơ, phiên, gói Pro và liên kết với đề xuất. Đề xuất vẫn giữ nhưng không còn tên người gửi. Không hoàn tác được.</p>
          <label><span>Gõ lại email <code>{user.email}</code> để xác nhận</span><input type="text" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} autoComplete="off" spellCheck={false} /></label>
          <div className="cn-admin-form__actions"><button type="submit" className="cn-admin-button is-danger" disabled={remove.isPending || confirmEmail.trim() !== user.email}><Icon name="trash" />Xoá vĩnh viễn</button></div>
          <ErrorText error={remove.error} />
        </form>
      </div>
    </Panel>
  )
}
