import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { admissionScore, convertGrade } from '../utils/grades'

const GRADE_FIELDS = ['score10'] as const
const ADMISSION_FIELDS = ['subject1', 'subject2', 'subject3', 'regionBonus', 'categoryBonus'] as const

export default function StudyPage() {
  const { t } = useTranslation('study')
  const ids = [useId(), useId(), useId(), useId(), useId(), useId()]
  const [values, setValues] = useState(['', '', '', '', '', ''])
  const [mode, setMode] = useState<'grade' | 'admission'>('grade')
  const grade = values[0] ? convertGrade(Number(values[0])) : null
  const admission = values.slice(1).every(Boolean) ? admissionScore(values.slice(1, 4).map(Number), Number(values[4]), Number(values[5])) : null
  const update = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{mode === 'grade' ? t('grades.gradeResult') : t('grades.admissionResult')}</p>
    <p className="erp-tool-result__value">{mode === 'grade' ? grade ? `${grade.letter} · ${grade.gradePoint}/4` : '—' : admission ? admission.total.toFixed(2) : '—'}</p>
    {admission && mode === 'admission' ? <p className="erp-tool-result__note">{t('grades.breakdown', { raw: admission.raw.toFixed(2), bonus: admission.adjustedBonus.toFixed(2) })}</p> : null}
    <p className="erp-tool-result__note">{t('grades.note')}</p>
  </div>}>
    <ToolPanel title={t('grades.title')}>
      <label className="erp-flow-field__label">{t('grades.mode')}
        <Form.Select value={mode} onChange={(event) => setMode(event.target.value as 'grade' | 'admission')}>
          <option value="grade">{t('grades.modeGrade')}</option><option value="admission">{t('grades.modeAdmission')}</option>
        </Form.Select>
      </label>
      <div className="erp-tool-form__grid mt-3">
        {(mode === 'grade' ? GRADE_FIELDS : ADMISSION_FIELDS).map((field, position) => {
          const index = mode === 'grade' ? 0 : position + 1
          return <label key={ids[index]} className="erp-flow-field__label" htmlFor={ids[index]}>{t(`grades.fields.${field}`)}
            <Form.Control id={ids[index]} type="number" min="0" max={position < 3 ? 10 : undefined} step="any" inputMode="decimal" value={values[index]} onChange={(event) => update(index, event.target.value)} />
          </label>
        })}
      </div>
    </ToolPanel>
  </ToolBoard>
}
