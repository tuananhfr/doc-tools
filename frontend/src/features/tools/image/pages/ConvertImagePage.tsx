import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlowChoice, useFlowRun, type FlowChoiceOption } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { useImageFiles } from '../hooks/useImageFiles'
import { canEncodeWebp } from '../services/image-codec'
import { convertImagesTask } from '../services/image-tasks'
import type { ImageFormat } from '../types/image.types'
import { IMAGE_FORMAT } from '../utils/image-format'

const TARGETS: { value: ImageFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
]

type Quality = 'high' | 'medium' | 'small'

const QUALITY_VALUE: Record<Quality, number> = { high: 0.92, medium: 0.8, small: 0.6 }

const QUALITY_IDS: Quality[] = ['high', 'medium', 'small']

/** CHUYỂN ĐỔI ẢNH — đổi cả lô giữa JPG, PNG và WebP. */
export default function ConvertImagePage() {
  const { t } = useTranslation('image')
  const targets: FlowChoiceOption<ImageFormat>[] = TARGETS.map((target) => ({ ...target, hint: t(`convert.target.${target.value}`) }))
  const qualities: FlowChoiceOption<Quality>[] = QUALITY_IDS.map((value) => ({ value, label: t(`convert.quality.${value}.label`), hint: t(`convert.quality.${value}.hint`) }))
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
      pickerTitle={t('convert.pickerTitle')}
      runLabel={count > 1 ? t('convert.runMany', { count, format: label }) : t('convert.runOne', { format: label })}
      runIcon="arrow-left-right"
      blocked={allSame ? (count > 1 ? t('convert.blockedMany', { format: label }) : t('convert.blockedOne', { format: label })) : null}
      task={() => convertImagesTask(images.items, { format, quality: QUALITY_VALUE[quality] })}
      options={
        <>
          <FlowChoice legend={t('convert.targetLegend')} value={format} options={webp ? targets : targets.filter((target) => target.value !== 'webp')} onChange={setFormat} />
          {format === 'png' ? null : <FlowChoice legend={t('convert.qualityLegend')} value={quality} options={qualities} onChange={setQuality} />}
          {webp ? null : <p className="erp-flow-field__hint">{t('convert.noWebp')}</p>}
        </>
      }
    />
  )
}
