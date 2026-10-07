import { useTranslation } from 'react-i18next'
import { intlLocale } from '@/i18n/intl'
import type { FormKind } from '../config/form-templates'

interface Props { kind: FormKind; values: Record<string, string> }
const value = (values: Record<string, string>, key: string) => values[key]?.trim() || '…………'
const SIGNATURES = { leave: ['approver', 'applicant'], authorization: ['attorney', 'principal'], handover: ['receiver', 'giver'] } as const
const cell = { border: '1px solid #555', padding: 6 }

// Giấy tờ in ra theo ngôn ngữ trang; chỉ phần người dùng gõ giữ nguyên.
export function FormPreview({ kind, values }: Props) {
  const { t } = useTranslation('documents')
  const date = new Date()
  const v = (key: string) => value(values, key)
  const upper = (text: string) => text.toLocaleUpperCase(intlLocale())
  return <article className="cn-form-print" style={{ background: '#fff', color: '#111', padding: 'clamp(20px, 4vw, 48px)', fontFamily: 'Times New Roman, serif', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
    <header style={{ textAlign: 'center', fontWeight: 700 }}>{t('formTemplates.print.nation')}<br /><span style={{ textDecoration: 'underline' }}>{t('formTemplates.print.motto')}</span></header>
    <p style={{ textAlign: 'end', fontStyle: 'italic', marginTop: 20 }}>{t('formTemplates.print.dateLine', { place: v('place'), day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() })}</p>
    <h2 style={{ textAlign: 'center', margin: '28px 0' }}>{upper(t(`formTemplates.names.${kind}`))}</h2>
    {kind === 'leave' ? <>
      <p>{t('formTemplates.print.leave.recipient', { value: v('recipient') })}</p>
      <p>{t('formTemplates.print.leave.name')} <strong>{v('name')}</strong><br />{t('formTemplates.print.leave.department', { value: v('department') })}</p>
      <p>{t('formTemplates.print.leave.period', { from: v('from'), to: v('to') })}</p>
      <p>{t('formTemplates.print.leave.reason', { value: v('reason') })}</p>
      <p>{t('formTemplates.print.leave.handover', { value: v('handover') })}</p>
      <p>{t('formTemplates.print.leave.closing')}</p>
    </> : kind === 'authorization' ? <>
      <p><strong>{t('formTemplates.print.authorization.principal')}</strong> {v('fromName')}<br />{t('formTemplates.print.authorization.personalId', { value: v('fromId') })}<br />{t('formTemplates.print.authorization.address', { value: v('fromAddress') })}</p>
      <p><strong>{t('formTemplates.print.authorization.attorney')}</strong> {v('toName')}<br />{t('formTemplates.print.authorization.personalId', { value: v('toId') })}<br />{t('formTemplates.print.authorization.address', { value: v('toAddress') })}</p>
      <p><strong>{t('formTemplates.print.authorization.scope')}</strong> {v('scope')}</p>
      <p><strong>{t('formTemplates.print.authorization.term')}</strong> {v('term')}</p>
      <p>{t('formTemplates.print.authorization.commitment')}</p>
    </> : <>
      <p>{t('formTemplates.print.handover.intro')}</p><p><strong>{t('formTemplates.print.handover.giver')}</strong> {v('giver')}<br /><strong>{t('formTemplates.print.handover.receiver')}</strong> {v('receiver')}</p>
      <p>{t('formTemplates.print.handover.itemsIntro')}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={cell}>{t('formTemplates.print.handover.number')}</th><th style={cell}>{t('formTemplates.print.handover.content')}</th></tr></thead><tbody>{(values.items?.trim().split('\n').filter(Boolean) || ['…………']).map((item, index) => <tr key={index}><td style={cell}>{index + 1}</td><td style={cell}>{item}</td></tr>)}</tbody></table>
      <p>{t('formTemplates.print.handover.note', { value: v('note') })}</p><p>{t('formTemplates.print.handover.copies')}</p>
    </>}
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 42, textAlign: 'center' }}>{SIGNATURES[kind].map((signature) => <div key={signature} style={{ minWidth: '38%' }}><strong>{upper(t(`formTemplates.print.signatures.${signature}`))}</strong><br /><em>{t('formTemplates.print.signHint')}</em></div>)}</div>
  </article>
}
