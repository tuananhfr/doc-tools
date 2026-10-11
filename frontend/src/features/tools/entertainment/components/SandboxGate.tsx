import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSandbox } from '../hooks/useSandbox'
import { SandboxNotice } from './SandboxNotice'

export function SandboxGate({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation('entertainment'); const gate = useSandbox()
  return <div className="cn-ent" lang={i18n.language === 'vi' ? 'vi' : 'en'} dir="ltr"><SandboxNotice />{gate.state === 'enabled' ? children : <section className="cn-ent-status" role="status"><h2>{t(`gate.${gate.state}`)}</h2><p>{t(gate.state === 'error' ? 'gate.errorHint' : 'gate.disabledHint')}</p>{gate.state === 'error' ? <button className="cn-button" onClick={gate.retry}>{t('actions.retry')}</button> : null}</section>}</div>
}
