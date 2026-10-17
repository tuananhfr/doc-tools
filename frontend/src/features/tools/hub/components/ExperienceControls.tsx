import { createContext, useContext, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { splitLocalePath } from '@/i18n/locales'
import { DEFAULT_EXPERIENCE_MODE, EXPERIENCE_MODES, experienceMode, type ExperienceMode } from '../utils/experience-mode'

export const ExperiencePlacementContext = createContext<((target: HTMLDivElement | null) => void) | undefined>(undefined)

/** A destination in the tool layout; the single selector keeps its state in the branch. */
export function ExperienceControlsSlot() {
  const place = useContext(ExperiencePlacementContext)
  return <div ref={place} className="cn-experience-slot" />
}

/** Presentation only: the Outlet and its files, inputs and running tasks stay mounted. */
export function ExperienceControls({ target }: { target: HTMLDivElement | null }) {
  const { t } = useTranslation('common', { keyPrefix: 'experience' })
  const id = useId()
  const { pathname } = useLocation()
  const [mode, setMode] = useState<ExperienceMode>(DEFAULT_EXPERIENCE_MODE)
  useEffect(() => { setMode(DEFAULT_EXPERIENCE_MODE) }, [pathname])
  useEffect(() => { document.documentElement.dataset.experience = mode }, [mode])
  if (splitLocalePath(pathname).rest.replace(/\/+$/, '') === '/cong-cu') return null
  const change = (value: ExperienceMode) => {
    setMode(value)
  }
  const controls = <div className="cn-experience-controls">
    <label htmlFor={id}>{t('label')}</label>
    <select id={id} value={mode} onChange={event => change(experienceMode(event.target.value))}>
      {EXPERIENCE_MODES.map(value => <option key={value} value={value}>{t(value)}</option>)}
    </select>
  </div>
  return target ? createPortal(controls, target) : <div className="cn-experience-fallback">{controls}</div>
}
