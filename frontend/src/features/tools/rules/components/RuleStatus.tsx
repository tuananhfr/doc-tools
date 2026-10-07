import { useTranslation } from 'react-i18next'
import type { SignedRulesState } from '../hooks/useSignedRules'
import { formatRuleDate } from '../services/signed-rules'

interface RuleStatusProps<T> {
  rules: SignedRulesState<T>
  /** Tên bộ số liệu chèn vào câu báo trước, ví dụ "bảng giá điện". */
  label: string
  /** Câu riêng của trang khi hệ thống chưa có gói nào đang hiệu lực; bỏ trống = không báo (gói phụ như thuế). */
  noneText?: string
}

/** Trạng thái gói đã ký, đặt cạnh nút "Áp dụng" — nút chỉ hiện khi `rules.state === 'ready'`. */
export function RuleStatus<T>({ rules, label, noneText }: RuleStatusProps<T>) {
  const { t } = useTranslation('rules')
  const upcoming = rules.state === 'ready' || rules.state === 'none' ? rules.upcoming : null
  return <>
    {rules.state === 'loading' ? <p className="mt-3" role="status">{t('status.loading')}</p> : null}
    {rules.state === 'none' && noneText ? <p className="mt-3">{noneText}</p> : null}
    {rules.state === 'invalid' ? <p className="mt-3" role="alert">{t('status.invalid')}</p> : null}
    {rules.state === 'unavailable' ? <p className="mt-3">{t('status.unavailable')}</p> : null}
    {upcoming ? <p className="mt-2">{t('status.upcoming', { date: formatRuleDate(upcoming.effectiveFrom), label, source: upcoming.source.title })}</p> : null}
  </>
}
