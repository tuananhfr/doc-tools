import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { SignedRulesState } from '../hooks/useSignedRules'
import { useLegalSource } from '../hooks/useLegalSource'
import { formatRuleDate, type VerifiedRulePackage } from '../services/signed-rules'
import { DEFAULT_STALE_DAYS, freshnessWarnings, toCheckedDate, type FreshnessWarning } from '../utils/source-freshness'

type SourceFreshnessProps =
  | { rules: SignedRulesState<unknown>; reference?: never }
  /** Trang không có gói ký (khai toán): nói thẳng là số tham khảo, không bịa ngày kiểm. */
  | { reference: true; rules?: never }

function Warning({ kind, children }: { kind: FreshnessWarning | 'registry-unavailable' | 'reference'; children: string }) {
  return (
    <p className="cn-freshness__warning" data-warning={kind}>
      <Icon name="exclamation-triangle-fill" />
      <span>{children}</span>
    </p>
  )
}

export function SourceFreshness(props: SourceFreshnessProps) {
  const { t } = useTranslation('rules')
  if (props.reference) {
    return (
      <aside className="cn-freshness" data-freshness="reference" aria-label={t('freshness.label')}>
        <Warning kind="reference">{t('freshness.reference')}</Warning>
      </aside>
    )
  }
  // Các trạng thái khác (đang tải, chưa có gói, hỏng) đã có RuleStatus báo — không nói lặp.
  return props.rules.state === 'ready' ? <PackageFreshness item={props.rules.current} /> : null
}

function PackageFreshness({ item }: { item: VerifiedRulePackage<unknown> }) {
  const { t } = useTranslation('rules')
  const registry = useLegalSource(item.sourceId)
  const source = registry.state === 'ready' ? registry.source : null
  const staleDays = registry.state === 'ready' ? registry.staleDays : DEFAULT_STALE_DAYS
  // Không có sổ nguồn thì ngày lấy văn bản về là mốc kiểm duy nhất có chữ ký bảo đảm.
  const checkedAt = source ? source.checkedAt : toCheckedDate(item.source.retrievedAt)
  const warnings = freshnessWarnings({ checkedAt, validTo: source ? source.validTo : item.effectiveTo ?? null, status: source?.status }, new Date(), staleDays)
  const registryDown = Boolean(item.sourceId) && (registry.state === 'missing' || registry.state === 'unavailable')
  const effectiveTo = source?.validTo ?? item.effectiveTo
  const effectiveFrom = source?.validFrom ?? item.effectiveFrom
  return (
    <aside className="cn-freshness" data-freshness={warnings.length || registryDown ? 'warning' : 'ok'} aria-label={t('freshness.label')}>
      <ul className="cn-freshness__facts">
        <li>
          <span className="cn-freshness__term">{t('freshness.source')}</span>{' '}
          {source
            ? <>{t('freshness.document', { number: source.documentNumber, issuer: source.issuer, jurisdiction: source.jurisdiction })}{source.article ? ` · ${t('freshness.article', { article: source.article })}` : ''}</>
            : <a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.title}</a>}
        </li>
        <li>{effectiveTo ? t('freshness.effectiveRange', { from: formatRuleDate(effectiveFrom), to: formatRuleDate(effectiveTo) }) : t('freshness.effective', { from: formatRuleDate(effectiveFrom) })}</li>
        {checkedAt ? <li>{t('freshness.checked', { date: formatRuleDate(checkedAt) })}</li> : null}
        {source ? <li><a href={source.evidenceUrl} target="_blank" rel="noopener noreferrer">{t('freshness.evidence')}</a></li> : null}
      </ul>
      {registryDown ? <Warning kind="registry-unavailable">{t('freshness.registryUnavailable')}</Warning> : null}
      {warnings.map((kind) => (
        <Warning key={kind} kind={kind}>
          {kind === 'stale' && checkedAt ? t('freshness.stale', { date: formatRuleDate(checkedAt), days: staleDays }) : t(`freshness.${kind}`)}
        </Warning>
      ))}
    </aside>
  )
}
