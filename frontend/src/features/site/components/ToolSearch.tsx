import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { searchTools } from '@/features/tools/hub/utils/tool-search'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { useSearchQuality } from '../hooks/useSearchQuality'

interface ToolSearchProps {
  id: string
  keyword: string
  onKeyword: (keyword: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
  qualityTracking?: boolean
  suggestions?: readonly ToolDefinition[]
}

export function ToolSearch({ id, keyword, onKeyword, onSubmit, placeholder, label, qualityTracking = false, suggestions }: ToolSearchProps) {
  const { t } = useTranslation('site')
  const track = useSearchQuality()
  const { base } = useToolsBranch()
  const composing = useRef(false)
  const [inputValue, setInputValue] = useState(keyword)
  useEffect(() => {
    if (!composing.current) setInputValue(keyword)
  }, [keyword])
  const matches = suggestions && inputValue.trim() ? searchTools(suggestions, inputValue).slice(0, 5) : []
  const listId = `${id}-suggestions`
  const updateInput = (value: string) => {
    setInputValue(value)
    if (!composing.current) onKeyword(value)
  }
  const finishComposition = (value: string) => {
    composing.current = false
    setInputValue(value)
    onKeyword(value)
  }
  return (
    <form className="cn-tool-search" role="search" onSubmit={(event) => { event.preventDefault(); if (composing.current) return; if (qualityTracking) track(inputValue); onSubmit?.() }}>
      <label className="visually-hidden" htmlFor={id}>{label ?? t('search.label')}</label>
      <Icon name="search" />
      <input
        id={id}
        name="q"
        type="search"
        placeholder={placeholder ?? t('search.placeholder')}
        autoComplete="off"
        value={inputValue}
        role={suggestions ? 'combobox' : undefined}
        aria-autocomplete={suggestions ? 'list' : undefined}
        aria-controls={suggestions && matches.length ? listId : undefined}
        aria-expanded={suggestions ? matches.length > 0 : undefined}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={(event) => finishComposition(event.currentTarget.value)}
        onChange={(event) => updateInput(event.target.value)}
      />
      {inputValue ? <button className="cn-search-clear" type="button" aria-label={t('search.clear')} onClick={() => updateInput('')}><Icon name="x-lg" /></button> : null}
      <button className="cn-search-submit" type="submit">{t('search.submit')}</button>
      {matches.length ? (
        <ul id={listId} className="cn-tool-search__suggestions" role="listbox" aria-label={t('search.label')}>
          {matches.map((tool) => (
            <li key={tool.id} role="option">
              <Link to={toolPath(base, tool)} onMouseDown={(event) => event.preventDefault()}>
                <Icon name={tool.icon} />
                <span>{tool.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
