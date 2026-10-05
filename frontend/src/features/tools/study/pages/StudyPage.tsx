import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { admissionScore, convertGrade } from '../utils/grades'

export default function StudyPage() {
  const ids = [useId(), useId(), useId(), useId(), useId(), useId()]
  const [values, setValues] = useState(['', '', '', '', '', ''])
  const [mode, setMode] = useState<'grade' | 'admission'>('grade')
  const grade = values[0] ? convertGrade(Number(values[0])) : null
  const admission = values.slice(1).every(Boolean) ? admissionScore(values.slice(1, 4).map(Number), Number(values[4]), Number(values[5])) : null
  const update = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{mode === 'grade' ? 'Quy đổi tham khảo' : 'Tổng điểm xét tuyển'}</p>
    <p className="erp-tool-result__value">{mode === 'grade' ? grade ? `${grade.letter} · ${grade.gradePoint}/4` : '—' : admission ? admission.total.toFixed(2) : '—'}</p>
    {admission && mode === 'admission' ? <p className="erp-tool-result__note">Điểm gốc {admission.raw.toFixed(2)} + ưu tiên đã điều chỉnh {admission.adjustedBonus.toFixed(2)}</p> : null}
    <p className="erp-tool-result__note">Thang quy đổi và quy chế ưu tiên có thể khác theo trường, năm tuyển sinh. Đối chiếu quy định của nơi áp dụng trước khi dùng.</p>
  </div>}>
    <ToolPanel title="Điểm học tập">
      <label className="erp-flow-field__label">Chế độ
        <Form.Select value={mode} onChange={(event) => setMode(event.target.value as 'grade' | 'admission')}>
          <option value="grade">Điểm hệ 10 sang hệ 4</option><option value="admission">Điểm xét tuyển</option>
        </Form.Select>
      </label>
      <div className="erp-tool-form__grid mt-3">
        {(mode === 'grade' ? ['Điểm hệ 10'] : ['Môn 1', 'Môn 2', 'Môn 3', 'Ưu tiên khu vực', 'Ưu tiên đối tượng']).map((label, position) => {
          const index = mode === 'grade' ? 0 : position + 1
          return <label key={ids[index]} className="erp-flow-field__label" htmlFor={ids[index]}>{label}
            <Form.Control id={ids[index]} type="number" min="0" max={position < 3 ? 10 : undefined} step="any" inputMode="decimal" value={values[index]} onChange={(event) => update(index, event.target.value)} />
          </label>
        })}
      </div>
    </ToolPanel>
  </ToolBoard>
}
