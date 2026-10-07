import { useTranslation } from 'react-i18next'
import { ToolLeaveGuard, useFlowRun } from '@/features/tools/hub'
import { CropOptions } from '../components/CropOptions'
import { CropStage } from '../components/CropStage'
import { ImageToolShell } from '../components/ImageToolShell'
import { useCropEdit } from '../hooks/useCropEdit'
import { useImageFiles } from '../hooks/useImageFiles'
import { cropTask } from '../services/edit-tasks'
import { isPristine } from '../utils/crop-state'

/** CẮT & CHỈNH ẢNH — một ảnh mỗi lượt: cắt theo khung, xoay 90°, chỉnh sáng và tương phản. */
export default function CropImagePage() {
  const { t } = useTranslation('image')
  const images = useImageFiles({ multiple: false })
  const run = useFlowRun()
  const item = images.items[0] ?? null
  const crop = useCropEdit(item)
  const state = crop.state
  const ready = item !== null && state !== null

  return (
    <>
      {/* Khung cắt và mức chỉnh chỉ nằm trong RAM: rời màn là phải làm lại từ đầu. */}
      <ToolLeaveGuard active={ready && !isPristine(state, item)} />
      <ImageToolShell
        images={images}
        run={run}
        multiple={false}
        pickerTitle={t('crop.pickerTitle')}
        stage={
          ready ? (
            <CropStage item={item} state={state} disabled={run.state.phase === 'running'} onRectChange={(rect) => crop.update((current) => ({ ...current, rect }))} />
          ) : undefined
        }
        options={ready ? <CropOptions item={item} state={state} onChange={crop.update} onReset={crop.reset} /> : undefined}
        runLabel={t('shared.saveImage')}
        runIcon="check2-circle"
        blocked={ready && isPristine(state, item) ? t('crop.blocked') : null}
        task={() => {
          if (!ready) throw new Error(t('shared.noImageSelected'))
          return cropTask(item, state)
        }}
      />
    </>
  )
}
