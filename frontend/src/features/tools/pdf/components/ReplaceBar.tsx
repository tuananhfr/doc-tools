import { Button, Form, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { FindReplace } from '../hooks/useFindReplace'

/** Ô "Thay bằng" + chọn tất cả + nút thay. Chỉ hiện khi đã bật Thay thế ở tab Tìm. */
export function ReplaceBar({ replace }: { replace: FindReplace }) {
  const { t } = useTranslation('pdf')
  const count = replace.selected.size
  return (
    <div className="erp-doc-search__replace">
      <Form.Control
        type="text"
        value={replace.replacement}
        placeholder={t('replace.placeholder')}
        aria-label={t('replace.label')}
        onChange={(event) => replace.setReplacement(event.target.value)}
      />
      <div className="erp-doc-search__replace-actions">
        <Form.Check
          id="doc-replace-all"
          type="checkbox"
          label={t('replace.selectAll', { count: replace.candidates })}
          checked={replace.allSelected}
          disabled={replace.candidates === 0}
          onChange={(event) => replace.toggleAll(event.target.checked)}
        />
        <Button size="sm" variant="primary" disabled={count === 0 || replace.running} onClick={() => void replace.apply()}>
          {replace.running ? <Spinner size="sm" as="span" className="me-2" /> : <Icon name="arrow-left-right" className="me-2" />}
          {t('replace.run', { count })}
        </Button>
      </div>
      <p className="erp-doc-search__note">
        <Icon name="info-circle" className="me-1" />
        {t('replace.note')}
      </p>
    </div>
  )
}
