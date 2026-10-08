import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { useUserAction } from '../hooks/useAdmin'
import { adminService } from '../services/admin.service'
import type { UserDetail } from '../types/admin.types'
import { ErrorText } from './AdminKit'

const REASON_MAX = 300

/**
 * Support path for a member who lost the old mailbox. Collapsed by default: it signs the person out
 * everywhere, so it should never be one stray click away.
 */
export function UserEmailForm({ user }: { user: UserDetail['user'] }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const change = useUserAction(user.id, () => adminService.changeEmail(user.id, email.trim(), reason.trim(), password))
  const close = () => { setOpen(false); setEmail(''); setReason(''); setPassword(''); change.reset() }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = email.trim()
    change.mutate(undefined, { onSuccess: () => { toast.success(`Đã đổi email sang ${next}. Người này đã bị đăng xuất mọi phiên.`); close() } })
  }

  if (!open) {
    return (
      <div className="cn-admin-form">
        <p className="cn-admin-lead">Email đăng nhập: <strong>{user.email}</strong></p>
        <div className="cn-admin-form__actions">
          <button type="button" className="cn-admin-button is-ghost" onClick={() => setOpen(true)}><Icon name="envelope-at" />Đổi email đăng nhập</button>
        </div>
      </div>
    )
  }

  return (
    <form className="cn-admin-form" onSubmit={submit} noValidate>
      <strong>Đổi email đăng nhập</strong>
      <p className="cn-admin-lead">
        Dùng khi người dùng mất hộp thư <code className="cn-admin-break">{user.email}</code>. Mọi phiên của họ bị đăng xuất; thư báo gửi tới cả email cũ
        và email mới. Ở email mới, họ đặt lại mật khẩu bằng “Quên mật khẩu”. Chỉ đổi khi đã xác minh đúng người.
      </p>
      <label>Email mới<input type="email" required maxLength={254} autoComplete="off" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); change.reset() }} /></label>
      <label>
        Lý do và cách đã xác minh (ghi vào nhật ký)
        <input type="text" required maxLength={REASON_MAX} value={reason} onChange={(event) => { setReason(event.target.value); change.reset() }} placeholder="Ví dụ: mất hộp thư công ty cũ, đối chiếu hoá đơn Pro" />
      </label>
      <label className="cn-admin-confirm">
        Mật khẩu của bạn
        <input type="password" required maxLength={128} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); change.reset() }} />
      </label>
      <ErrorText error={change.error} />
      <div className="cn-admin-form__actions">
        <button type="submit" className="cn-admin-button" disabled={change.isPending || !email.trim() || !reason.trim() || !password}>
          <Icon name="check2" />{change.isPending ? 'Đang đổi…' : 'Đổi email'}
        </button>
        <button type="button" className="cn-admin-button is-ghost" disabled={change.isPending} onClick={close}>Huỷ</button>
      </div>
    </form>
  )
}
