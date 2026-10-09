import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { newId } from '@/utils/id'
import { settleGroup } from '../utils/group-settlement'
import { addedLater, duplicateNames, namedPeople, reconcilePeople, type GroupPerson } from '../utils/group-roster'

// Người trả / người chia lưu theo id người, không theo tên: đổi tên không làm rơi họ khỏi khoản chi.
// `knownIds` = những người đã có lúc tạo khoản, để nhận ra người thêm sau.
interface ExpenseInput { id: string; payer: string; amount: string; participants: string[]; knownIds: string[] }

const AMOUNT: NumberRule = { kind: 'money', min: 1, max: 1e12 }

export default function GroupSplitPage() {
  const { t } = useTranslation('finance')
  const peopleId = useId()
  // Tên mẫu theo ngôn ngữ trang — người dùng sẽ gõ đè tên thật.
  const [initial] = useState(() => {
    const roster: GroupPerson[] = [t('groupSplit.samplePeople.0'), t('groupSplit.samplePeople.1')].map((name) => ({ id: newId(), name }))
    const ids = roster.map((person) => person.id)
    return { roster, expense: { id: newId(), payer: ids[0], amount: '', participants: ids, knownIds: ids } }
  })
  const [peopleText, setPeopleText] = useState(initial.roster.map((person) => person.name).join('\n'))
  const [roster, setRoster] = useState(initial.roster)
  const [expenses, setExpenses] = useState<ExpenseInput[]>([initial.expense])
  const people = namedPeople(roster)
  const nameOf = new Map(people.map((person) => [person.id, person.name]))
  const duplicates = duplicateNames(roster)
  const amounts = expenses.map((expense) => readNumber(expense.amount, AMOUNT))
  // Người đã bị xoá khỏi danh sách thì không còn chia phần nào.
  const result = duplicates.length === 0 && amounts.every((amount) => amount !== null) ? settleGroup(people.map((person) => person.id), expenses.map((expense, index) => ({
    payer: expense.payer, amount: amounts[index] ?? 0, participants: expense.participants.filter((id) => nameOf.has(id)),
  }))) : null
  const update = (index: number, patch: Partial<ExpenseInput>) => setExpenses((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item))
  const changePeople = (text: string) => {
    setPeopleText(text)
    setRoster((current) => reconcilePeople(current, text.split(/\r?\n/), newId))
  }
  const addExpense = () => setExpenses((current) => [...current, {
    id: newId(), payer: people[0]?.id ?? '', amount: '', participants: people.map((person) => person.id), knownIds: roster.map((person) => person.id),
  }])
  const money = (value: number) => t('shared.amount', { amount: formatNumber(Math.round(Math.abs(value))) })
  const duplicateText = duplicates.length ? t('groupSplit.duplicateNames', { names: duplicates.join(', ') }) : ''

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('groupSplit.resultLabel')}</p>
    {result ? <>
      {result.transfers.length ? <ul className="erp-tool-rows">
        {result.transfers.map((transfer) => <li className="erp-tool-row" key={`${transfer.from}-${transfer.to}`}>
          <span className="erp-tool-row__label">{nameOf.get(transfer.from)} → {nameOf.get(transfer.to)}</span><span className="erp-tool-row__value">{money(transfer.amount)}</span>
        </li>)}
      </ul> : <p className="erp-tool-result__value">{t('groupSplit.balanced')}</p>}
      <p className="erp-tool-result__label mt-2">{t('groupSplit.balanceTitle')}</p>
      <ul className="erp-tool-rows">
        {people.map((person) => {
          const balance = Math.round(result.balances[person.id] ?? 0)
          return <li className="erp-tool-row" key={person.id}>
            <span className="erp-tool-row__label">{person.name}</span>
            <span className="erp-tool-row__value">{balance > 0 ? t('groupSplit.balanceReceive', { amount: money(balance) })
              : balance < 0 ? t('groupSplit.balancePay', { amount: money(balance) }) : t('groupSplit.balanceEven')}</span>
          </li>
        })}
      </ul>
    </> : <>
      <p className="erp-tool-result__value">—</p>
      <p className="erp-tool-result__note" role="status">{duplicateText || t('groupSplit.invalid')}</p>
    </>}
    <p className="erp-tool-result__note">{t('groupSplit.note')}</p>
  </div>}>
    <ToolPanel title={t('groupSplit.membersTitle')}>
      <label className="erp-flow-field__label" htmlFor={peopleId}>{t('groupSplit.onePerLine')}</label>
      <Form.Control id={peopleId} as="textarea" rows={3} value={peopleText} isInvalid={duplicates.length > 0} aria-describedby={duplicates.length ? `${peopleId}-dup` : undefined} onChange={(event) => changePeople(event.target.value)} />
      {duplicates.length ? <p id={`${peopleId}-dup`} className="erp-tool-form__error mb-0">{duplicateText}</p> : null}
    </ToolPanel>
    <ToolPanel title={t('groupSplit.expensesTitle')} actions={<Button variant="link" size="sm" onClick={addExpense}>{t('groupSplit.addExpense')}</Button>}>
      {expenses.map((expense, index) => {
        const later = addedLater(roster, expense.knownIds, expense.participants)
        return <div className="erp-tool-panel mb-3" key={expense.id}>
          <div className="erp-tool-form__grid">
            <label className="erp-flow-field__label">{t('groupSplit.payer')}
              <Form.Select value={nameOf.has(expense.payer) ? expense.payer : ''} onChange={(event) => update(index, { payer: event.target.value })}>
                <option value="">{t('groupSplit.choosePerson')}</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </Form.Select>
            </label>
            <NumberField label={t('groupSplit.amount')} rule={AMOUNT} unit="đ" value={expense.amount} onChange={(value) => update(index, { amount: value })} />
          </div>
          <fieldset className="mt-2"><legend className="erp-flow-field__label">{t('groupSplit.participants')}</legend>
            <div className="d-flex flex-wrap gap-3">{people.map((person) => <Form.Check key={person.id} id={`${expense.id}-${person.id}`} label={person.name} checked={expense.participants.includes(person.id)} onChange={(event) => update(index, { participants: event.target.checked ? [...expense.participants, person.id] : expense.participants.filter((id) => id !== person.id) })} />)}</div>
          </fieldset>
          {later.length ? <p className="erp-tool-result__note mb-0">{t('groupSplit.addedLater', { names: later.map((person) => person.name).join(', ') })}</p> : null}
          {expenses.length > 1 ? <Button variant="link" size="sm" onClick={() => setExpenses((current) => current.filter((_, position) => position !== index))}>{t('groupSplit.removeExpense')}</Button> : null}
        </div>
      })}
    </ToolPanel>
  </ToolBoard>
}
