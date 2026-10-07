import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { compressTask } from '../../services/quick-tasks'
import type { Compression } from '../../utils/compression'

const ACCEPT: readonly QuickKind[] = ['pdf']

type Level = Exclude<Compression, 'none'>

const LEVELS: readonly Level[] = ['medium', 'strong']

/** NÉN PDF — nén lại ảnh JPEG trong tệp; chữ và ảnh PNG giữ nguyên. */
export default function CompressPdfPage() {
  const { t } = useTranslation('pdf')
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [level, setLevel] = useState<Level>('medium')
  const count = quick.items.length
  const levels: FlowChoiceOption<Level>[] = LEVELS.map((value) => ({ value, label: t(`compress.level.${value}`), hint: t(`compress.level.${value}Hint`) }))

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle={t('compress.pickerTitle')}
      runLabel={count > 1 ? t('compress.runMany', { count }) : t('compress.run')}
      runIcon="file-earmark-zip"
      blocked={null}
      task={() => compressTask(quick.items, level)}
      options={
        <>
          <FlowChoice legend={t('compress.levelLegend')} value={level} options={levels} onChange={setLevel} />
          <p className="erp-flow-field__hint">{t('compress.note')}</p>
        </>
      }
    />
  )
}
