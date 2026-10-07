import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'

interface ToolSearchProps {
  id: string
  keyword: string
  onKeyword: (keyword: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
}

export function ToolSearch({ id, keyword, onKeyword, onSubmit, placeholder, label }: ToolSearchProps) {
  const { t } = useTranslation('site')
  return (
    <form className="cn-tool-search" role="search" onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
      <label className="visually-hidden" htmlFor={id}>{label ?? t('search.label')}</label>
      <Icon name="search" />
      <input id={id} name="q" type="search" placeholder={placeholder ?? t('search.placeholder')} autoComplete="off" value={keyword} onChange={(event) => onKeyword(event.target.value)} />
      {keyword ? <button className="cn-search-clear" type="button" aria-label={t('search.clear')} onClick={() => onKeyword('')}><Icon name="x-lg" /></button> : null}
      <button className="cn-search-submit" type="submit">{t('search.submit')}</button>
    </form>
  )
}
