import { DailyStudio } from '@/features/tools/utility/components/DailyStudio'
import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { formatQuantity, NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { admissionScore, convertGrade } from '../utils/grades'

const GRADE_FIELDS = ['score10'] as const
const ADMISSION_FIELDS = ['subject1', 'subject2', 'subject3', 'regionBonus', 'categoryBonus'] as const
const SCORE: NumberRule = { kind: 'decimal', min: 0, max: 10 }
// Trần theo mức cao nhất của quy chế tuyển sinh (khu vực 0,75; đối tượng 2) — chỉ để chặn gõ nhầm "75" thay vì "0,75".
const RULES: NumberRule[] = [SCORE, SCORE, SCORE, SCORE, { kind: 'decimal', min: 0, max: 0.75 }, { kind: 'decimal', min: 0, max: 2 }]

export default function StudyPage() {
  const { t } = useTranslation('study')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.study' })
  const [values, setValues] = useState(['', '', '', '', '', ''])
  const [mode, setMode] = useState<'grade' | 'admission'>('grade')
  const numbers = values.map((value, index) => readNumber(value, RULES[index]))
  const grade = numbers[0] !== null ? convertGrade(numbers[0]) : null
  const [, subject1, subject2, subject3, regionBonus, categoryBonus] = numbers
  const admission = subject1 !== null && subject2 !== null && subject3 !== null && regionBonus !== null && categoryBonus !== null
    ? admissionScore([subject1, subject2, subject3], regionBonus, categoryBonus) : null
  const update = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <DailyStudio kind="study"><ToolBoard className="cn-study-workspace" layout="compact" side={<div className="erp-tool-result cn-study-result" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="award" /></span><div><h2>2. {mode === 'grade' ? t('grades.gradeResult') : t('grades.admissionResult')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className="cn-study-score">{(mode === 'grade' ? grade : admission) ? null : <Icon name="journal-text" />}<p className="erp-tool-result__value">{mode === 'grade' ? grade ? `${grade.letter} · ${formatQuantity(grade.gradePoint)}/4` : '—' : admission ? formatQuantity(admission.total) : '—'}</p></div>
    {admission && mode === 'admission' ? <p className="erp-tool-result__note">{t('grades.breakdown', { raw: formatQuantity(admission.raw), bonus: formatQuantity(admission.adjustedBonus) })}</p> : null}
    <p className="erp-tool-result__note">{t('grades.note')}</p>
  </div>}>
    <ToolPanel title={`1. ${t('grades.title')}`} actions={<span className="cn-studio-small-icon"><Icon name="mortarboard" /></span>}>
      <div className="cn-study-modes" role="group" aria-label={t('grades.mode')}>{(['grade', 'admission'] as const).map(value => <Button key={value} variant={mode === value ? 'primary' : 'outline-secondary'} aria-pressed={mode === value} onClick={() => setMode(value)}><Icon name={value === 'grade' ? 'journal-check' : 'calculator'} />{t(value === 'grade' ? 'grades.modeGrade' : 'grades.modeAdmission')}</Button>)}</div>
      <p className="cn-studio-form-hint mt-3">{studio(mode === 'grade' ? 'gradeHint' : 'admissionHint')}</p>
      <div className="erp-tool-form__grid mt-3">
        {(mode === 'grade' ? GRADE_FIELDS : ADMISSION_FIELDS).map((field, position) => {
          const index = mode === 'grade' ? 0 : position + 1
          return <NumberField key={field} label={t(`grades.fields.${field}`)} rule={RULES[index]} value={values[index]} onChange={(value) => update(index, value)} />
        })}
      </div>
    </ToolPanel>
  </ToolBoard></DailyStudio>
}
