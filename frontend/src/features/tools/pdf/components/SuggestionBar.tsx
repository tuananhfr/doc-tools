import { Button, CloseButton } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { Suggestion, SuggestionId } from '../utils/suggest-actions'

interface SuggestionBarProps {
  suggestions: Suggestion[]
  disabled: boolean
  onRun: (id: SuggestionId) => void
  onDismiss: () => void
}

/** Việc nên làm tiếp ngay sau khi thả tệp — người mới khỏi phải dò hết thanh công cụ. */
export function SuggestionBar({ suggestions, disabled, onRun, onDismiss }: SuggestionBarProps) {
  const { t } = useTranslation('pdf')
  if (suggestions.length === 0) return null

  return (
    <section className="erp-doc-suggest" aria-label={t('suggest.label')}>
      <span className="erp-doc-suggest__label">
        <Icon name="lightbulb" className="me-2" />
        {t('suggest.title')}
      </span>
      <div className="erp-doc-suggest__actions">
        {suggestions.map((item) => (
          <Button key={item.id} variant="outline-secondary" size="sm" disabled={disabled} onClick={() => onRun(item.id)}>
            <Icon name={item.icon} className="me-2" />
            {item.label}
          </Button>
        ))}
      </div>
      <CloseButton className="erp-doc-suggest__close" aria-label={t('suggest.dismiss')} onClick={onDismiss} />
    </section>
  )
}
