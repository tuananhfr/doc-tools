import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FlowChoice, useFlowRun, type FlowChoiceOption } from '@/features/tools/hub'
import { ImageToolShell } from '../components/ImageToolShell'
import { useImageFiles } from '../hooks/useImageFiles'
import { compressImagesTask } from '../services/image-tasks'

type Level = 'light' | 'medium' | 'strong'

const LEVEL_QUALITY: Record<Level, number> = { light: 0.85, medium: 0.7, strong: 0.5 }

const LEVEL_IDS: Level[] = ['light', 'medium', 'strong']

/** Cạnh dài tối đa (px); 0 = giữ kích thước. */
const EDGES = [0, 3840, 2560, 1920, 1280]

/** NÉN ẢNH — nén cả lô, giữ định dạng từng ảnh; có thể thu nhỏ cạnh dài. */
export default function CompressImagePage() {
  const { t } = useTranslation('image')
  const levels: FlowChoiceOption<Level>[] = LEVEL_IDS.map((value) => ({ value, label: t(`compress.level.${value}.label`), hint: t(`compress.level.${value}.hint`) }))
  const ids = useId()
  const images = useImageFiles({ multiple: true })
  const run = useFlowRun()
  const [level, setLevel] = useState<Level>('medium')
  const [maxEdge, setMaxEdge] = useState(0)
  const count = images.items.length

  return (
    <ImageToolShell
      images={images}
      run={run}
      multiple
      pickerTitle={t('compress.pickerTitle')}
      runLabel={count > 1 ? t('compress.runMany', { count }) : t('compress.runOne')}
      runIcon="file-earmark-zip"
      blocked={null}
      task={() => compressImagesTask(images.items, { quality: LEVEL_QUALITY[level], maxEdge: maxEdge || null })}
      options={
        <>
          <FlowChoice legend={t('compress.levelLegend')} value={level} options={levels} onChange={setLevel} />
          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-edge`}>
              {t('shared.maxEdge')}
            </label>
            <Form.Select id={`${ids}-edge`} value={maxEdge} onChange={(event) => setMaxEdge(Number(event.target.value))}>
              {EDGES.map((edge) => (
                <option key={edge} value={edge}>
                  {edge === 0 ? t('shared.keepSize') : `${edge} px`}
                </option>
              ))}
            </Form.Select>
          </div>
          <p className="erp-flow-field__hint">{t('compress.hint')}</p>
        </>
      }
    />
  )
}
