import { useTranslation } from 'react-i18next'
import type { SandboxEnvelope } from '../types/entertainment.types'

export function ResultProvenance({ result }: { result: SandboxEnvelope<unknown> }) {
  const { t } = useTranslation('entertainment')
  return <details className="cn-ent-source"><summary>{t('source.title')}</summary><dl><div><dt>{t('source.version')}</dt><dd>{result.rule_version}</dd></div><div><dt>{t('source.sources')}</dt><dd>{result.source_ids.join(', ')}</dd></div><div><dt>{t('source.request')}</dt><dd>{result.request_id}</dd></div></dl><p>{t('source.pending')}</p></details>
}
