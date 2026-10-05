import { useId, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { settleGroup } from '../utils/group-settlement'

interface ExpenseInput { payer: string; amount: string; participants: string[] }

export default function GroupSplitPage() {
  const peopleId = useId()
  const [peopleText, setPeopleText] = useState('An\nBình')
  const [expenses, setExpenses] = useState<ExpenseInput[]>([{ payer: 'An', amount: '', participants: ['An', 'Bình'] }])
  const people = useMemo(() => peopleText.split(/\r?\n/).map((person) => person.trim()).filter(Boolean), [peopleText])
  const result = expenses.every((expense) => expense.amount !== '') ? settleGroup(people, expenses.map((expense) => ({ payer: expense.payer, amount: Number(expense.amount), participants: expense.participants }))) : null
  const update = (index: number, patch: Partial<ExpenseInput>) => setExpenses((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Chuyển tiền để cân bằng</p>
    {result ? result.transfers.length ? <ul className="erp-tool-rows">
      {result.transfers.map((transfer, index) => <li className="erp-tool-row" key={`${transfer.from}-${transfer.to}-${index}`}>
        <span className="erp-tool-row__label">{transfer.from} → {transfer.to}</span><span className="erp-tool-row__value">{formatNumber(Math.round(transfer.amount))} đ</span>
      </li>)}
    </ul> : <p className="erp-tool-result__value">Đã cân bằng</p> : <p className="erp-tool-result__value">—</p>}
    <p className="erp-tool-result__note">Các khoản chia đều trong từng nhóm người tham gia. Số tiền chuyển được làm tròn đến đồng.</p>
  </div>}>
    <ToolPanel title="Thành viên">
      <label className="erp-flow-field__label" htmlFor={peopleId}>Mỗi người một dòng</label>
      <Form.Control id={peopleId} as="textarea" rows={3} value={peopleText} onChange={(event) => setPeopleText(event.target.value)} />
    </ToolPanel>
    <ToolPanel title="Khoản chi" actions={<Button variant="link" size="sm" onClick={() => setExpenses((current) => [...current, { payer: people[0] ?? '', amount: '', participants: [...people] }])}>Thêm khoản</Button>}>
      {expenses.map((expense, index) => <div className="erp-tool-panel mb-3" key={index}>
        <div className="erp-tool-form__grid">
          <label className="erp-flow-field__label">Người trả
            <Form.Select value={expense.payer} onChange={(event) => update(index, { payer: event.target.value })}>
              <option value="">Chọn người</option>{people.map((person) => <option key={person} value={person}>{person}</option>)}
            </Form.Select>
          </label>
          <label className="erp-flow-field__label">Số tiền (đ)
            <Form.Control type="number" min="1" step="1" inputMode="numeric" value={expense.amount} onChange={(event) => update(index, { amount: event.target.value })} />
          </label>
        </div>
        <fieldset className="mt-2"><legend className="erp-flow-field__label">Người cùng chia</legend>
          <div className="d-flex flex-wrap gap-3">{people.map((person) => <Form.Check key={person} label={person} checked={expense.participants.includes(person)} onChange={(event) => update(index, { participants: event.target.checked ? [...expense.participants, person] : expense.participants.filter((name) => name !== person) })} />)}</div>
        </fieldset>
        {expenses.length > 1 ? <Button variant="link" size="sm" onClick={() => setExpenses((current) => current.filter((_, position) => position !== index))}>Bỏ khoản</Button> : null}
      </div>)}
    </ToolPanel>
  </ToolBoard>
}
