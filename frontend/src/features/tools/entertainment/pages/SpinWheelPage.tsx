import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { useSpinWheel } from '../hooks/useSpinWheel'
import { SpinWheel } from '../components/SpinWheel'
import { WheelOptionsEditor } from '../components/WheelOptionsEditor'
import { WheelSettings } from '../components/WheelSettings'
import { WheelSavedLists } from '../components/WheelSavedLists'
import { WinConfetti } from '../components/WinConfetti'

export default function SpinWheelPage() {
  const { t } = useTranslation('entertainment')
  const wheel = useSpinWheel(t('wheel.sample'))

  return <ToolBoard layout="compact" sideLabel={t('wheel.optionsTitle')} side={<div className="cn-wheel-side">
    <WheelOptionsEditor text={wheel.text} parsed={wheel.parsed} disabled={wheel.spinning} onChange={wheel.setText} />
    <WheelSettings wheel={wheel} />
    <WheelSavedLists options={wheel.parsed.options} disabled={wheel.spinning} onLoad={(list) => wheel.replaceText(list.options.join('\n'))} />
  </div>}>
    <ToolPanel title={t('wheel.title')} className="cn-wheel-stage">
      <SpinWheel options={wheel.wheelOptions} rotation={wheel.rotation} durationMs={wheel.durationMs}
        spinning={wheel.spinning} soundOn={wheel.soundOn} winnerIndex={wheel.winnerIndex} onSpinEnd={wheel.finishSpin} />
      <WinConfetti burst={wheel.history.length} />
      <div className="cn-wheel-result" aria-live="polite">
        {wheel.spinning
          ? <p className="cn-wheel-result__hint">{t('wheel.spinning')}</p>
          : wheel.winner
            ? <><p className="cn-wheel-result__label">{t('wheel.resultLabel')}</p><p key={wheel.history.length} className="cn-wheel-result__value">{wheel.winner}</p></>
            : <p className="cn-wheel-result__hint">{t('wheel.resultHint')}</p>}
      </div>
      <Button size="lg" className="cn-wheel-spin" disabled={!wheel.canSpin} onClick={wheel.spin}>
        {t(wheel.winner ? 'wheel.spinAgain' : 'wheel.spin')}
      </Button>
    </ToolPanel>
  </ToolBoard>
}
