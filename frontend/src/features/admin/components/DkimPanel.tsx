import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { copyText } from '@/features/tools/hub/utils/clipboard'
import { useGenerateDkim } from '../hooks/useAdmin'
import type { Integrations } from '../types/admin.types'
import { ErrorText } from './AdminKit'
import { ConfirmPasswordField } from './IntegrationFields'

/** A fresh selector per key lets the old DNS record keep validating mail already in flight. */
function nextSelector(current: string) {
  const match = /^(.*?)(\d+)$/.exec(current)
  return match ? `${match[1]}${Number(match[2]) + 1}` : current ? `${current}2` : 'cn1'
}

export function DkimPanel({ data }: { data: Integrations }) {
  const toast = useToast()
  const generate = useGenerateDkim()
  const current = data.mail.values.dkimSelector
  const [selector, setSelector] = useState(() => nextSelector(current))
  const [password, setPassword] = useState('')
  const record = data.mail.dkimRecord

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const replacing = Boolean(record)
    if (replacing && !window.confirm('Khoá mới thay khoá đang ký ngay. Thư chỉ đạt DKIM sau khi bản ghi DNS mới có hiệu lực. Tiếp tục?')) return
    generate.mutate({ password, selector }, {
      onSuccess: (result) => {
        setPassword('')
        setSelector(nextSelector(result.record.selector))
        toast.success('Đã tạo khoá DKIM. Thêm bản ghi DNS bên dưới vào tên miền.')
      },
    })
  }
  const copy = async (text: string) => { if (await copyText(text)) toast.success('Đã chép.') }

  return (
    <div className="cn-admin-dkim">
      <h3>Khoá DKIM</h3>
      {record ? (
        <div className="cn-admin-dkim__record">
          <p className="cn-admin-sub">Thêm bản ghi TXT này ở nơi quản lý DNS của tên miền (selector <code>{current}</code>):</p>
          <dl className="cn-admin-facts">
            <dt>Tên</dt>
            <dd><code className="cn-admin-break">{record.host}</code><button type="button" className="cn-admin-link" onClick={() => void copy(record.host)}><Icon name="copy" />Chép</button></dd>
            <dt>Giá trị</dt>
            <dd><code className="cn-admin-break">{record.value}</code><button type="button" className="cn-admin-link" onClick={() => void copy(record.value)}><Icon name="copy" />Chép</button></dd>
          </dl>
          <p className="cn-admin-sub">Giá trị dài hơn 255 ký tự: một số nhà cung cấp DNS cần tách thành nhiều chuỗi trong cùng một bản ghi.</p>
        </div>
      ) : <p className="cn-admin-lead">Chưa có khoá. Khoá riêng được tạo và cất mã hoá trên máy chủ; ở đây chỉ hiện bản ghi DNS cần thêm.</p>}
      <form className="cn-admin-form" onSubmit={submit} noValidate>
        <label>
          Selector cho khoá mới
          <input required maxLength={63} spellCheck={false} pattern="[a-z0-9-]+" value={selector} onChange={(event) => setSelector(event.target.value.toLowerCase())} />
          <span className="cn-admin-sub">Chữ thường, số, dấu gạch ngang. Dùng selector mới mỗi lần đổi khoá.</span>
        </label>
        {!data.encryptionReady ? <p className="cn-admin-sub">Cần <code>CONFIG_ENCRYPTION_KEY</code> trên máy chủ để cất khoá riêng.</p> : null}
        <ConfirmPasswordField id="cn-dkim-confirm" value={password} onChange={setPassword} />
        <ErrorText error={generate.error} />
        <div className="cn-admin-form__actions">
          <button type="submit" className="cn-admin-button is-ghost" disabled={generate.isPending || !password || !selector || !data.encryptionReady}>
            <Icon name="key" />{generate.isPending ? 'Đang tạo…' : record ? 'Tạo khoá mới' : 'Tạo khoá DKIM'}
          </button>
        </div>
      </form>
    </div>
  )
}
