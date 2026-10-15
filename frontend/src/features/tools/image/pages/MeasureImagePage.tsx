import { useTranslation } from 'react-i18next'
import { ToolLeaveGuard, useFlowRun, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { useThemeTokens } from '@/hooks'
import { ImageToolShell } from '../components/ImageToolShell'
import { MeasureOptions } from '../components/MeasureOptions'
import { MeasureStage } from '../components/MeasureStage'
import { useImageFiles } from '../hooks/useImageFiles'
import { useMeasure } from '../hooks/useMeasure'
import { measureTask } from '../services/edit-tasks'
import { scaleOf } from '../utils/measure'

/**
 * ĐO KÍCH THƯỚC ẢNH — đặt một đoạn chuẩn đã biết chiều dài, rồi đo khoảng cách,
 * diện tích và đếm ngay trên ảnh. Kết quả là ảnh gốc có vẽ sẵn các số đo.
 */
export default function MeasureImagePage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.measure' })
  const images = useImageFiles({ multiple: false })
  const run = useFlowRun()
  const tokens = useThemeTokens()
  const item = images.items[0] ?? null
  const [state, dispatch] = useMeasure(item?.id ?? null)
  const scale = scaleOf(state.reference)
  const running = run.state.phase === 'running'

  // Điểm đã đặt chỉ nằm trong RAM: rời màn là phải đo lại từ đầu.
  const marked = state.shapes.length > 0 || state.draft.length > 0 || state.reference !== null

  return (
    <div className="cn-measure-workspace">
      <ToolLeaveGuard active={item !== null && marked} />
      <ImageToolShell
        images={images}
        run={run}
        multiple={false}
        pickerTitle={t('measure.pickerTitle')}
        stage={item ? <MeasureStage item={item} state={state} scale={scale} disabled={running} dispatch={dispatch} /> : undefined}
        options={item ? <MeasureOptions state={state} scale={scale} dispatch={dispatch} /> : <div className="cn-measure-welcome"><div className="cn-measure-art" aria-hidden="true"><Icon name="image" /><span /><Icon name="rulers" /></div><h2>{studio('emptyTitle')}</h2><p>{studio('emptyHint')}</p><div className="cn-measure-features">{(['distance', 'area', 'count'] as const).map((mode, index) => <span key={mode}><Icon name={['rulers', 'bounding-box', '123'][index]} />{t(`measure.tab.${mode}`)}</span>)}</div></div>}
        runLabel={t('measure.run')}
        runIcon="download"
        blocked={state.shapes.length === 0 ? t('measure.blocked') : null}
        task={() => {
          if (!item) throw new Error(t('shared.noImageSelected'))
          return measureTask(item, state, { line: tokens.brand, reference: tokens.actionSecondary, halo: tokens.textOnAccent })
        }}
      />
      <div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('stepChoose'), studio('stepScale'), studio('stepMeasure')]} tip={studio('tip')} /></div>
    </div>
  )
}
