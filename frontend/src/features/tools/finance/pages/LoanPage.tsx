import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { downloadOutput, NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { calculateLoan, calculateSavings, type LoanMethod } from '../utils/loan'

const PRINCIPAL: NumberRule = { kind: 'money', min: 1, max: 1e13 }
const RATE: NumberRule = { kind: 'decimal', min: 0, max: 1000 }
const LOAN_MONTHS: NumberRule = { kind: 'integer', min: 1, max: 600 }
const SAVINGS_MONTHS: NumberRule = { kind: 'integer', min: 1, max: 120 }
const RENEWALS: NumberRule = { kind: 'integer', min: 1, max: 100 }
// Trên mức này gần như chắc là gõ nhầm lãi tháng vào ô lãi năm, hoặc thừa một chữ số.
const UNUSUAL_RATE = 50

export default function LoanPage() {
  const { t } = useTranslation('finance')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [months, setMonths] = useState('')
  const [method, setMethod] = useState<LoanMethod>('annuity')
  const [mode, setMode] = useState<'loan' | 'savings'>('loan')
  const [renewals, setRenewals] = useState('1')
  const principalValue = readNumber(principal, PRINCIPAL)
  const rateValue = readNumber(rate, RATE)
  const monthsValue = readNumber(months, mode === 'loan' ? LOAN_MONTHS : SAVINGS_MONTHS)
  const renewalsValue = readNumber(renewals, RENEWALS)
  const ready = principalValue !== null && rateValue !== null && monthsValue !== null
  const schedule = ready && mode === 'loan' ? calculateLoan(principalValue, rateValue, monthsValue, method) : null
  const savings = ready && mode === 'savings' && renewalsValue !== null ? calculateSavings(principalValue, rateValue, monthsValue, renewalsValue) : null

  const downloadSchedule = () => {
    if (!schedule) return
    const rows = [(['period', 'principal', 'interest', 'payment', 'balance'] as const).map((column) => t(`loan.file.columns.${column}`)), ...schedule.rows.map((row) => [row.month, row.principal, row.interest, row.payment, row.balance].map((value) => String(Math.round(value))))]
    downloadOutput({ name: `${t('loan.file.name')}.csv`, blob: new Blob(['\uFEFF', rows.map((row) => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }) })
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{mode === 'loan' ? t('loan.totalPayment') : t('loan.finalBalance')}</p>
    <p className="erp-tool-result__value">{schedule ? t('shared.amount', { amount: formatNumber(Math.round(schedule.totalPayment)) }) : savings ? t('shared.amount', { amount: formatNumber(Math.round(savings.total)) }) : '—'}</p>
    {schedule ? <>
      <p className="erp-tool-result__note">{t('loan.interest', { amount: formatNumber(Math.round(schedule.totalInterest)) })}</p>
      <p className="erp-tool-result__note">{t('loan.firstPayment', { amount: formatNumber(Math.round(schedule.rows[0].payment)) })}</p>
      <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={downloadSchedule}>{t('loan.downloadCsv')}</button>
      <div className="table-responsive mt-3"><table className="table table-sm"><thead><tr><th>{t('loan.table.period')}</th><th>{t('loan.table.principal')}</th><th>{t('loan.table.interest')}</th><th>{t('loan.table.balance')}</th></tr></thead><tbody>
        {schedule.rows.map((row) => <tr key={row.month}><td>{row.month}</td><td>{formatNumber(Math.round(row.principal))}</td><td>{formatNumber(Math.round(row.interest))}</td><td>{formatNumber(Math.round(row.balance))}</td></tr>)}
      </tbody></table></div>
    </> : savings ? <p className="erp-tool-result__note">{t('loan.savingsNote', { amount: formatNumber(Math.round(savings.interest)), months: savings.months })}</p> : <p className="erp-tool-result__note">{t('loan.hint')}</p>}
    {rateValue !== null && rateValue > UNUSUAL_RATE ? <p className="erp-tool-result__note" role="status">{t('loan.rateWarning', { rate: formatNumber(rateValue) })}</p> : null}
    <p className="erp-tool-result__note">{mode === 'loan' ? t('loan.disclaimer') : t('loan.savingsDisclaimer')}</p>
  </div>}>
    <ToolPanel title={mode === 'loan' ? t('loan.loanTitle') : t('loan.savingsTitle')}>
      <label className="erp-flow-field__label">{t('loan.mode')}
        <Form.Select value={mode} onChange={(event) => setMode(event.target.value as 'loan' | 'savings')}>
          <option value="loan">{t('loan.modes.loan')}</option><option value="savings">{t('loan.modes.savings')}</option>
        </Form.Select>
      </label>
      <div className="erp-tool-form__grid">
        <NumberField label={mode === 'loan' ? t('loan.loanAmount') : t('loan.savingsAmount')} rule={PRINCIPAL} unit="đ" value={principal} onChange={setPrincipal} />
        <NumberField label={t('loan.rate')} rule={RATE} unit="%" value={rate} onChange={setRate} />
        <NumberField label={mode === 'loan' ? t('loan.loanTerm') : t('loan.savingsTerm')} rule={mode === 'loan' ? LOAN_MONTHS : SAVINGS_MONTHS} value={months} onChange={setMonths} />
        {mode === 'loan' ? <label className="erp-flow-field__label">{t('loan.method')}
          <Form.Select value={method} onChange={(event) => setMethod(event.target.value as LoanMethod)}>
            <option value="annuity">{t('loan.methods.annuity')}</option><option value="equal-principal">{t('loan.methods.equalPrincipal')}</option>
          </Form.Select>
        </label> : <NumberField label={t('loan.renewals')} rule={RENEWALS} value={renewals} onChange={setRenewals} />}
      </div>
    </ToolPanel>
  </ToolBoard>
}
