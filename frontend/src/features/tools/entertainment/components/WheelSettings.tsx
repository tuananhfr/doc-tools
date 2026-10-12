import { useId } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolPanel } from '@/features/tools/hub'
import type { SpinWheelState } from '../hooks/useSpinWheel'

export function WheelSettings({ wheel }: { wheel: SpinWheelState }) {
  const { t } = useTranslation('entertainment')
  const switchId = useId()
  const lastOne = wheel.eliminate && !wheel.spinning && wheel.pool.length === 1 ? wheel.pool[0] : null

  return <ToolPanel title={t('wheel.settingsTitle')}>
    <Form.Check type="switch" id={switchId} checked={wheel.eliminate} disabled={wheel.spinning}
      label={t('wheel.eliminate')} onChange={(event) => wheel.setEliminate(event.target.checked)} />
    <p className="cn-wheel-help">{t('wheel.eliminateHelp')}</p>
    {lastOne ? <p className="cn-wheel-warning" role="status">{t('wheel.lastOne', { name: lastOne })}</p> : null}
    {wheel.history.length ? <>
      <h3 className="cn-wheel-subtitle">{t('wheel.order')}</h3>
      <ol className="cn-wheel-order">{wheel.history.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ol>
    </> : null}
    {wheel.history.length || wheel.removedCount ? <Button variant="outline-secondary" size="sm" disabled={wheel.spinning} onClick={wheel.restore}>
      {t('wheel.restore')}
    </Button> : null}
  </ToolPanel>
}
