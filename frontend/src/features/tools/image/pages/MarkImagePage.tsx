import { ToolLeaveGuard, useFlowRun } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { MarkOptions } from '../components/MarkOptions'
import { MarkStage } from '../components/MarkStage'
import { useImageFiles } from '../hooks/useImageFiles'
import { useMarkEdit } from '../hooks/useMarkEdit'
import { markTask } from '../services/edit-tasks'
import { hasMarks } from '../utils/mark'

/** CHE & ĐÓNG DẤU ẢNH — một ảnh mỗi lượt: khối đen che thông tin, dòng chữ đóng dấu; cả hai ghi thẳng vào điểm ảnh. */
export default function MarkImagePage() {
  const images = useImageFiles({ multiple: false })
  const run = useFlowRun()
  const item = images.items[0] ?? null
  const mark = useMarkEdit(item)
  const state = mark.state
  const ready = item !== null && state !== null

  return (
    <>
      {/* Khung che và dấu chỉ nằm trong RAM: rời màn là phải vẽ lại từ đầu. */}
      <ToolLeaveGuard active={ready && hasMarks(state)} />
      <ImageToolShell
        images={images}
        run={run}
        multiple={false}
        pickerTitle="Chọn ảnh cần che hoặc đóng dấu"
        stage={ready ? <MarkStage item={item} state={state} disabled={run.state.phase === 'running'} onBoxesChange={(boxes) => mark.update((current) => ({ ...current, boxes }))} /> : undefined}
        options={ready ? <MarkOptions state={state} onChange={mark.update} /> : undefined}
        runLabel="Lưu ảnh"
        runIcon="check2-circle"
        blocked={ready && !hasMarks(state) ? 'Chưa vẽ khung che hay nhập chữ đóng dấu — ảnh ra sẽ giống hệt ảnh gốc.' : null}
        task={() => {
          if (!ready) throw new Error('chưa chọn ảnh.')
          return markTask(item, state)
        }}
      />
    </>
  )
}
