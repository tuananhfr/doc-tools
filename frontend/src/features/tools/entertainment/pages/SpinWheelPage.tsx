import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { useSpinWheel } from '../hooks/useSpinWheel'
import { SpinWheel } from '../components/SpinWheel'
import { WheelOptionsEditor } from '../components/WheelOptionsEditor'
import { WheelSettings } from '../components/WheelSettings'
import { WheelSavedLists } from '../components/WheelSavedLists'
import { WinConfetti } from '../components/WinConfetti'
import { EntertainmentStudio } from '../components/EntertainmentStudio'

export default function SpinWheelPage() {
  const { t } = useTranslation('entertainment')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.wheel' })
  const wheel = useSpinWheel(t('wheel.sample'))

  return <EntertainmentStudio kind="wheel"><ToolBoard className="cn-wheel-workspace" layout="wide-result" sideLabel={t('wheel.title')} side={
    <ToolPanel title={`2. ${t('wheel.title')}`} className="cn-wheel-stage" actions={<span className="cn-studio-small-icon"><Icon name="bullseye" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      <div className="cn-wheel-canvas">
      <SpinWheel options={wheel.wheelOptions} rotation={wheel.rotation} durationMs={wheel.durationMs}
        spinning={wheel.spinning} soundOn={wheel.soundOn} winnerIndex={wheel.winnerIndex} onSpinEnd={wheel.finishSpin} />
      <WinConfetti burst={wheel.history.length} />
      </div>
      <div className="cn-wheel-result" aria-live="polite">
        {wheel.spinning
          ? <p className="cn-wheel-result__hint">{t('wheel.spinning')}</p>
          : wheel.winner
            ? <><p className="cn-wheel-result__label">{t('wheel.resultLabel')}</p><p key={wheel.history.length} className="cn-wheel-result__value">{wheel.winner}</p></>
            : <p className="cn-wheel-result__hint">{t('wheel.resultHint')}</p>}
      </div>
      <Button size="lg" className="cn-wheel-spin" disabled={!wheel.canSpin} onClick={wheel.spin}>
        <Icon name="arrow-repeat" className="me-2" />
        {t(wheel.winner ? 'wheel.spinAgain' : 'wheel.spin')}
      </Button>
    </ToolPanel>
  }>
    <div className="cn-fun-wheel-controls">
      <WheelOptionsEditor text={wheel.text} parsed={wheel.parsed} disabled={wheel.spinning} onChange={wheel.setText} />
      <div className="cn-fun-wheel-settings"><WheelSettings wheel={wheel} /></div>
      <div className="cn-fun-wheel-saved"><WheelSavedLists options={wheel.parsed.options} disabled={wheel.spinning} onLoad={(list) => wheel.replaceText(list.options.join('\n'))} /></div>
    </div>
  </ToolBoard></EntertainmentStudio>
}
