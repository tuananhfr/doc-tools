import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui'
import { CONTRIBUTION_STATUS, NEXT_STEPS, RISK_LABEL, TRANSITION } from '../config/admin-labels'
import { useContribution, useTransition } from '../hooks/useAdmin'
import type { Transition } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'
import { AdminPage, Empty, ErrorText, LoadError, Panel, Pill, SkeletonRows } from './AdminKit'
import { useStaff } from './RequirePermission'
import { AuditTimeline } from './AuditTimeline'

const SOURCE_TYPE: Record<string, string> = { OFFICIAL_WEB: 'Trang chính thức', OFFICIAL_DOCUMENT: 'Văn bản chính thức', OFFICIAL_API: 'API chính thức', OTHER: 'Khác' }

export function ContributionReview({ id, onBack }: { id: string; onBack: () => void }) {
  const staff = useStaff()
  const toast = useToast()
  const detail = useContribution(id)
  const transition = useTransition(id)
  const [step, setStep] = useState<Transition | null>(null)
  const [note, setNote] = useState('')
  const [digest, setDigest] = useState('')
  const back = <button type="button" className="cn-admin-button is-ghost" onClick={onBack}><Icon name="arrow-left" />Danh sách</button>

  if (detail.isPending) return <AdminPage title="Đề xuất" actions={back}><SkeletonRows rows={8} /></AdminPage>
  if (detail.isError) return <AdminPage title="Đề xuất" actions={back}><LoadError error={detail.error} onRetry={() => void detail.refetch()} /></AdminPage>
  const { contribution: item, trail } = detail.data
  const meta = CONTRIBUTION_STATUS[item.status]
  const steps = NEXT_STEPS[item.status] ?? []
  const isIdea = item.domain === 'ideas'
  // The API refuses these too; saying so up front saves a round trip and a confusing error.
  const blockedBy = (action: Transition) => {
    if (action === 'approve' && item.reviewedBy === staff.email) return 'Bạn đã xác minh đề xuất này.'
    if (action === 'publish' && (item.reviewedBy === staff.email || item.approvedBy === staff.email)) return 'Bạn đã xác minh hoặc phê duyệt đề xuất này.'
    return null
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!step) return
    transition.mutate({ action: step, note: note.trim(), digest: digest.trim() }, {
      onSuccess: () => { toast.success(`${TRANSITION[step].label}: xong.`); setStep(null); setNote(''); setDigest('') },
    })
  }

  return (
    <AdminPage title={isIdea ? 'Ý tưởng tiện ích' : `Góp ý dữ liệu · ${item.domain}`} description={<>Công cụ <code>{item.toolId}</code> · gửi {formatDateTime(item.createdAt)} · {item.submitterEmail ?? 'khách (không đăng nhập)'}</>} actions={back}>
      <div className="cn-admin-pills">
        <Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill>
        <Pill tone={item.risk === 'HIGH' ? 'danger' : item.risk === 'MEDIUM' ? 'warning' : 'neutral'} icon="exclamation-diamond">Rủi ro {RISK_LABEL[item.risk].toLowerCase()}</Pill>
        {item.attribution === null ? null : <Pill tone="neutral" icon={item.attribution ? 'person-check' : 'person-dash'}>{item.attribution ? 'Muốn ghi tên' : 'Không ghi tên'}</Pill>}
      </div>

      <div className="cn-admin-grid is-wide-left">
        <div className="cn-admin-stack">
          <Panel title={`Thay đổi đề xuất (${item.proposedChanges.length})`}>
            <div className="cn-admin-table-wrap">
              <table className="cn-admin-table is-compact is-diff">
                <thead><tr><th>Trường</th>{isIdea ? null : <th>Hiện tại</th>}<th>{isIdea ? 'Nội dung' : 'Đề xuất'}</th></tr></thead>
                <tbody>{item.proposedChanges.map((change, index) => (
                  <tr key={`${change.field}-${index}`}><td><code>{change.field}</code></td>{isIdea ? null : <td className="is-before">{change.before || '—'}</td>}<td className="is-after">{change.after}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
          <Panel title={`Nguồn (${item.sourceRefs.length})`}>
            {item.sourceRefs.length ? (
              <ul className="cn-admin-sources">
                {item.sourceRefs.map((source) => (
                  <li key={source.url}><Pill tone={source.type.startsWith('OFFICIAL_') ? 'positive' : 'neutral'}>{SOURCE_TYPE[source.type] ?? source.type}</Pill><a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.url}<Icon name="box-arrow-up-right" /></a></li>
                ))}
              </ul>
            ) : <Empty icon="link-45deg" title="Chưa có nguồn" text={isIdea ? 'Ý tưởng không cần nguồn.' : 'Dữ liệu quy định cần nguồn trước khi xác minh.'} />}
          </Panel>
          <Panel title="Lịch sử">
            <AuditTimeline rows={trail.map((row, index) => ({ key: `${index}`, at: row.createdAt, action: row.action, who: row.actor.startsWith('user:') ? 'người gửi' : row.actor, note: row.note }))} />
          </Panel>
        </div>

        <Panel title="Bước tiếp theo">
          <dl className="cn-admin-facts">
            <dt>Xác minh</dt><dd>{item.reviewedBy ?? '—'}</dd>
            <dt>Phê duyệt</dt><dd>{item.approvedBy ?? '—'}</dd>
            {item.publishedDigest ? <><dt>Gói đã công bố</dt><dd><code>{item.publishedDigest.slice(0, 16)}…</code></dd></> : null}
            {item.baseSnapshotId ? <><dt>Dựa trên bản</dt><dd><code>{item.baseSnapshotId.slice(0, 16)}…</code></dd></> : null}
            {item.jurisdiction ? <><dt>Phạm vi</dt><dd>{item.jurisdiction}</dd></> : null}
          </dl>
          {steps.length === 0 ? <p className="cn-admin-lead">Đề xuất đã ở trạng thái cuối, không còn bước nào.</p> : (
            <div className="cn-admin-steps">
              {steps.map((action) => {
                const reason = blockedBy(action)
                return (
                  <button key={action} type="button" className={`cn-admin-button ${TRANSITION[action].danger ? 'is-danger-ghost' : step === action ? '' : 'is-ghost'}`} aria-pressed={step === action} disabled={Boolean(reason)} title={reason ?? undefined} onClick={() => { setStep(action); transition.reset() }}>
                    {TRANSITION[action].label}
                  </button>
                )
              })}
            </div>
          )}
          {steps.some((action) => blockedBy(action)) ? <p className="cn-admin-sub">Một số bước bị khoá vì cần người khác làm.</p> : null}
          {step ? (
            <form className="cn-admin-form" onSubmit={submit}>
              <p className="cn-admin-lead">{TRANSITION[step].help}</p>
              {step === 'publish' && !isIdea ? (
                <label>Digest gói quy định (64 ký tự hex)<input type="text" required pattern="[0-9a-fA-F]{64}" value={digest} onChange={(event) => setDigest(event.target.value)} spellCheck={false} autoComplete="off" /></label>
              ) : null}
              {step === 'publish' ? null : (
                <label>{step === 'verify' ? 'Ghi chú xác minh' : step === 'reject' ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}
                  <textarea rows={3} maxLength={2000} required={step === 'verify' || step === 'reject'} minLength={step === 'verify' ? 10 : undefined} value={note} onChange={(event) => setNote(event.target.value)} />
                </label>
              )}
              <div className="cn-admin-form__actions">
                <button type="submit" className={`cn-admin-button${TRANSITION[step].danger ? ' is-danger' : ''}`} disabled={transition.isPending}>{TRANSITION[step].label}</button>
                <button type="button" className="cn-admin-button is-ghost" onClick={() => setStep(null)}>Huỷ</button>
              </div>
              <ErrorText error={transition.error} />
            </form>
          ) : null}
        </Panel>
      </div>
    </AdminPage>
  )
}
