import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { formatQuantity, NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { admissionScore, convertGrade } from '../utils/grades'

const GRADE_FIELDS = ['score10'] as const
const ADMISSION_FIELDS = ['subject1', 'subject2', 'subject3', 'regionBonus', 'categoryBonus'] as const
const SCORE: NumberRule = { kind: 'decimal', min: 0, max: 10 }
// Trần theo mức cao nhất của quy chế tuyển sinh (khu vực 0,75; đối tượng 2) — chỉ để chặn gõ nhầm "75" thay vì "0,75".
const RULES: NumberRule[] = [SCORE, SCORE, SCORE, SCORE, { kind: 'decimal', min: 0, max: 0.75 }, { kind: 'decimal', min: 0, max: 2 }]

export default function StudyPage() {
  const { t } = useTranslation('study')
  const [values, setValues] = useState(['', '', '', '', '', ''])
  const [mode, setMode] = useState<'grade' | 'admission'>('grade')
  const numbers = values.map((value, index) => readNumber(value, RULES[index]))
  const grade = numbers[0] !== null ? convertGrade(numbers[0]) : null
  const [, subject1, subject2, subject3, regionBonus, categoryBonus] = numbers
  const admission = subject1 !== null && subject2 !== null && subject3 !== null && regionBonus !== null && categoryBonus !== null
    ? admissionScore([subject1, subject2, subject3], regionBonus, categoryBonus) : null
  const update = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{mode === 'grade' ? t('grades.gradeResult') : t('grades.admissionResult')}</p>
    <p className="erp-tool-result__value">{mode === 'grade' ? grade ? `${grade.letter} · ${formatQuantity(grade.gradePoint)}/4` : '—' : admission ? formatQuantity(admission.total) : '—'}</p>
    {admission && mode === 'admission' ? <p className="erp-tool-result__note">{t('grades.breakdown', { raw: formatQuantity(admission.raw), bonus: formatQuantity(admission.adjustedBonus) })}</p> : null}
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
          return <NumberField key={field} label={t(`grades.fields.${field}`)} rule={RULES[index]} value={values[index]} onChange={(value) => update(index, value)} />
        })}
      </div>
    </ToolPanel>
  </ToolBoard>
}
