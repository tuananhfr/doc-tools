import { ToolLeaveGuard, useFlowRun } from '@/features/tools/hub'
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
    <>
      <ToolLeaveGuard active={item !== null && marked} />
      <ImageToolShell
        images={images}
        run={run}
        multiple={false}
        pickerTitle="Chọn ảnh cần đo"
        stage={item ? <MeasureStage item={item} state={state} scale={scale} disabled={running} dispatch={dispatch} /> : undefined}
        options={item ? <MeasureOptions state={state} scale={scale} dispatch={dispatch} /> : undefined}
        runLabel="Lưu ảnh có số đo"
        runIcon="download"
        blocked={state.shapes.length === 0 ? 'Chưa có số đo nào trên ảnh.' : null}
        task={() => {
          if (!item) throw new Error('chưa chọn ảnh.')
          return measureTask(item, state, { line: tokens.brand, reference: tokens.actionSecondary, halo: tokens.textOnAccent })
        }}
      />
    </>
  )
}
