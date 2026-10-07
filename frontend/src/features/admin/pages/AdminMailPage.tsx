import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { AdminPage, Empty, ErrorText, LoadError, Pager, Panel, Pill, SetState, SkeletonRows } from '../components/AdminKit'
import { useStaff } from '../components/RequirePermission'
import { MAIL_STATUS, MAIL_TEMPLATE, MAIL_TRANSPORT } from '../config/admin-labels'
import { useMail, useMailDns, useSendTestMail } from '../hooks/useAdmin'
import { MAIL_STATUSES, type DnsCheck } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'

const DNS_TONE: Record<DnsCheck['state'], { tone: 'positive' | 'warning' | 'danger'; icon: string; label: string }> = {
  ok: { tone: 'positive', icon: 'check2-circle', label: 'Có' },
  warning: { tone: 'warning', icon: 'exclamation-triangle', label: 'Cần sửa' },
  missing: { tone: 'warning', icon: 'dash-circle', label: 'Chưa có' },
  error: { tone: 'danger', icon: 'x-octagon', label: 'Lỗi tra cứu' },
}

export default function AdminMailPage() {
  const staff = useStaff()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = MAIL_STATUSES.find((value) => value === params.get('status'))
  const page = Math.max(1, Number(params.get('page')) || 1)
  const mail = useMail(status, page)
  const [checkDns, setCheckDns] = useState(false)
  const dns = useMailDns(checkDns)
  const [to, setTo] = useState('')
  const send = useSendTestMail()
  const config = mail.data?.config

  const sendTest = (event: FormEvent) => {
    event.preventDefault()
    send.mutate(to.trim(), { onSuccess: () => toast.success('Đã xếp thư thử vào hàng đợi. Trạng thái hiện ở bảng bên dưới.') })
  }

  return (
    <AdminPage title="Email" description="Hàng đợi thư đi và cấu hình gửi. Nội dung thư (mã đăng nhập) không bao giờ hiện ở đây.">
      <div className="cn-admin-grid is-two">
        <Panel title="Cấu hình gửi">
          {config ? (
            <dl className="cn-admin-facts">
              <dt>Cách gửi</dt><dd>{MAIL_TRANSPORT[config.transport]}{config.transport === 'log' ? <Pill tone="warning" icon="exclamation-triangle">Không gửi thư thật</Pill> : null}</dd>
              <dt>Người gửi</dt><dd>{config.fromName} &lt;{config.from}&gt;</dd>
              <dt>HELO</dt><dd>{config.heloName}</dd>
              {config.transport === 'smtp' ? <><dt>SMTP</dt><dd>{config.smtp.host}:{config.smtp.port}{config.smtp.secure ? ' (TLS)' : ''} · tài khoản <SetState ok={config.smtp.userSet} /> · mật khẩu <SetState ok={config.smtp.passwordSet} /></dd></> : null}
              <dt>DKIM</dt><dd>{config.dkim.selector ? <>selector <code>{config.dkim.selector}</code> · </> : null}khoá <SetState ok={config.dkim.keyFileReadable}>{config.dkim.keyFileReadable ? 'Đọc được' : config.dkim.keyFileSet ? 'Không đọc được tệp' : 'Chưa đặt'}</SetState></dd>
            </dl>
          ) : mail.isError ? <LoadError error={mail.error} /> : <SkeletonRows rows={4} />}
          <p className="cn-admin-sub">Đổi cấu hình bằng <code>.env</code> của backend rồi khởi động lại. Bí mật không hiện ra đây.</p>
        </Panel>
        <Panel title="Gửi thư thử">
          {staff.permissions.includes('mail.test') ? (
            <form className="cn-admin-form" onSubmit={sendTest}>
              <label>Gửi tới (để trống = email của bạn)<input type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder={staff.email} maxLength={254} /></label>
              <div className="cn-admin-form__actions"><button type="submit" className="cn-admin-button" disabled={send.isPending}><Icon name="send" />Gửi thư thử</button></div>
              <ErrorText error={send.error} />
            </form>
          ) : <p className="cn-admin-lead">Vai trò của bạn chỉ được xem.</p>}
          <p className="cn-admin-sub">Thư lỗi không gửi lại được: nội dung bị xoá ngay khi thư rời hàng đợi để mã đăng nhập không nằm lại trong cơ sở dữ liệu. Người dùng chỉ cần xin mã mới.</p>
        </Panel>
      </div>

      <Panel title="DNS của tên miền gửi" actions={<button type="button" className="cn-admin-button is-ghost" disabled={dns.isFetching} onClick={() => checkDns ? void dns.refetch() : setCheckDns(true)}><Icon name="arrow-repeat" />{checkDns ? 'Kiểm lại' : 'Kiểm tra DNS'}</button>}>
        {!checkDns ? <p className="cn-admin-lead">Tra MX, SPF, DKIM, DMARC trực tiếp từ máy chủ. Cần cho cách gửi “thẳng”; bản ghi chuẩn lấy từ <code>npm run mail -- dkim-keygen</code>.</p>
          : dns.isPending ? <SkeletonRows rows={4} /> : dns.isError ? <LoadError error={dns.error} onRetry={() => void dns.refetch()} /> : (
            <div className="cn-admin-table-wrap">
              <table className="cn-admin-table is-compact">
                <thead><tr><th>Bản ghi</th><th>Tên</th><th>Kết quả</th><th>Giá trị · gợi ý</th></tr></thead>
                <tbody>{dns.data.checks.map((check) => {
                  const tone = DNS_TONE[check.state]
                  return (
                    <tr key={check.name}>
                      <td><strong>{check.name}</strong></td><td><code>{check.host}</code></td>
                      <td><Pill tone={tone.tone} icon={tone.icon}>{tone.label}</Pill></td>
                      <td>{check.value ? <code className="cn-admin-break">{check.value}</code> : null}<span className="cn-admin-sub">{check.hint}</span></td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
      </Panel>

      <Panel title="Hàng đợi thư" flush actions={(
        <select aria-label="Lọc trạng thái" value={status ?? ''} onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {}, { replace: true })}>
          <option value="">Mọi trạng thái</option>
          {MAIL_STATUSES.map((value) => <option key={value} value={value}>{MAIL_STATUS[value].label}</option>)}
        </select>
      )}>
        {mail.isPending ? <SkeletonRows /> : mail.isError ? <LoadError error={mail.error} onRetry={() => void mail.refetch()} /> : mail.data.items.length === 0 ? <Empty icon="envelope-open" title="Hàng đợi trống" text="Thư đã gửi hoặc lỗi được giữ 30 ngày." /> : (
          <div className="cn-admin-table-wrap">
            <table className="cn-admin-table">
              <thead><tr><th>Người nhận</th><th>Loại</th><th>Trạng thái</th><th className="is-num">Lần thử</th><th>Tạo</th><th>Gửi xong / lỗi</th></tr></thead>
              <tbody>{mail.data.items.map((row) => {
                const meta = MAIL_STATUS[row.status]
                return (
                  <tr key={row.id}>
                    <td>{row.to}</td><td>{MAIL_TEMPLATE[row.template] ?? row.template}</td>
                    <td><Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill></td>
                    <td className="is-num">{row.attempts}</td><td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.sentAt ? formatDateTime(row.sentAt) : row.lastError ? <span className="cn-admin-error-text">{row.lastError}</span> : row.status === 'pending' && row.attempts ? `thử lại ${formatDateTime(row.nextAttemptAt)}` : '—'}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
        {mail.data ? <Pager page={mail.data.page} pageSize={mail.data.pageSize} total={mail.data.total} onPage={(value) => setParams({ ...(status ? { status } : {}), page: String(value) }, { replace: true })} /> : null}
      </Panel>
    </AdminPage>
  )
}
