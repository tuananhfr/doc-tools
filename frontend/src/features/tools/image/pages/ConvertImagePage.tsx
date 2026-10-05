import { useState } from 'react'
import { FlowChoice, useFlowRun, type FlowChoiceOption } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { useImageFiles } from '../hooks/useImageFiles'
import { canEncodeWebp } from '../services/image-codec'
import { convertImagesTask } from '../services/image-tasks'
import type { ImageFormat } from '../types/image.types'
import { IMAGE_FORMAT } from '../utils/image-format'

const TARGETS: FlowChoiceOption<ImageFormat>[] = [
  { value: 'jpeg', label: 'JPG', hint: 'Nhẹ, mở được ở mọi nơi. Không giữ nền trong suốt.' },
  { value: 'png', label: 'PNG', hint: 'Giữ nguyên từng điểm ảnh và nền trong suốt; tệp nặng hơn.' },
  { value: 'webp', label: 'WebP', hint: 'Nhẹ hơn JPG ở cùng chất lượng, giữ được nền trong suốt.' },
]

type Quality = 'high' | 'medium' | 'small'

const QUALITY_VALUE: Record<Quality, number> = { high: 0.92, medium: 0.8, small: 0.6 }

const QUALITIES: FlowChoiceOption<Quality>[] = [
  { value: 'high', label: 'Cao', hint: 'Gần như không khác ảnh gốc.' },
  { value: 'medium', label: 'Vừa', hint: 'Cân giữa độ nét và dung lượng.' },
  { value: 'small', label: 'Nhỏ gọn', hint: 'Nhẹ nhất; phóng to sẽ thấy vỡ nét.' },
]

/** CHUYỂN ĐỔI ẢNH — đổi cả lô giữa JPG, PNG và WebP. */
export default function ConvertImagePage() {
  const images = useImageFiles({ multiple: true })
  const run = useFlowRun()
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState<Quality>('high')
  // Safari không ghi được WebP — không mời thứ trình duyệt này không làm được.
  const [webp] = useState(canEncodeWebp)

  const count = images.items.length
  const label = IMAGE_FORMAT[format].label
  const allSame = count > 0 && images.items.every((item) => item.format === format)

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple
      pickerTitle="Chọn ảnh cần đổi định dạng"
      runLabel={count > 1 ? `Chuyển ${count} ảnh sang ${label}` : `Chuyển sang ${label}`}
      runIcon="arrow-left-right"
      blocked={allSame ? `${count > 1 ? 'Các ảnh' : 'Ảnh'} đã chọn là ${label} sẵn.` : null}
      task={() => convertImagesTask(images.items, { format, quality: QUALITY_VALUE[quality] })}
      options={
        <>
          <FlowChoice legend="Chuyển sang" value={format} options={webp ? TARGETS : TARGETS.filter((target) => target.value !== 'webp')} onChange={setFormat} />
          {format === 'png' ? null : <FlowChoice legend="Chất lượng" value={quality} options={QUALITIES} onChange={setQuality} />}
          {webp ? null : <p className="erp-flow-field__hint">Trình duyệt này không xuất được WebP.</p>}
        </>
      }
    />
  )
}
