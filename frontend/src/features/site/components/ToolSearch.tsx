import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useSearchQuality } from '../hooks/useSearchQuality'

interface ToolSearchProps {
  id: string
  keyword: string
  onKeyword: (keyword: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
  qualityTracking?: boolean
}

export function ToolSearch({ id, keyword, onKeyword, onSubmit, placeholder, label, qualityTracking = false }: ToolSearchProps) {
  const { t } = useTranslation('site')
  const track = useSearchQuality()
  return (
    <form className="cn-tool-search" role="search" onSubmit={(event) => { event.preventDefault(); if (qualityTracking) track(keyword); onSubmit?.() }}>
      <label className="visually-hidden" htmlFor={id}>{label ?? t('search.label')}</label>
      <Icon name="search" />
      <input id={id} name="q" type="search" placeholder={placeholder ?? t('search.placeholder')} autoComplete="off" value={keyword} onChange={(event) => onKeyword(event.target.value)} />
      {keyword ? <button className="cn-search-clear" type="button" aria-label={t('search.clear')} onClick={() => onKeyword('')}><Icon name="x-lg" /></button> : null}
      <button className="cn-search-submit" type="submit">{t('search.submit')}</button>
    </form>
  )
}
