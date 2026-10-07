import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { calculateLoan, calculateSavings, type LoanMethod } from '../utils/loan'

export default function LoanPage() {
  const { t } = useTranslation('finance')
  const principalId = useId()
  const rateId = useId()
  const monthsId = useId()
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [months, setMonths] = useState('')
  const [method, setMethod] = useState<LoanMethod>('annuity')
  const [mode, setMode] = useState<'loan' | 'savings'>('loan')
  const [renewals, setRenewals] = useState('1')
  const schedule = principal && rate && months && mode === 'loan' ? calculateLoan(Number(principal), Number(rate), Number(months), method) : null
  const savings = principal && rate && months && mode === 'savings' ? calculateSavings(Number(principal), Number(rate), Number(months), Number(renewals)) : null

  const downloadSchedule = () => {
    if (!schedule) return
    const rows = [['Kỳ', 'Gốc', 'Lãi', 'Phải trả', 'Dư nợ'], ...schedule.rows.map((row) => [row.month, row.principal, row.interest, row.payment, row.balance].map(String))]
    downloadOutput({ name: 'bang-tra-no.csv', blob: new Blob(['\uFEFF', rows.map((row) => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }) })
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
    <p className="erp-tool-result__note">{t('loan.disclaimer')}</p>
  </div>}>
    <ToolPanel title={mode === 'loan' ? t('loan.loanTitle') : t('loan.savingsTitle')}>
      <label className="erp-flow-field__label">{t('loan.mode')}
        <Form.Select value={mode} onChange={(event) => setMode(event.target.value as 'loan' | 'savings')}>
          <option value="loan">{t('loan.modes.loan')}</option><option value="savings">{t('loan.modes.savings')}</option>
        </Form.Select>
      </label>
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={principalId}>{mode === 'loan' ? t('loan.loanAmount') : t('loan.savingsAmount')}
          <Form.Control id={principalId} inputMode="decimal" type="number" min="1" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={rateId}>{t('loan.rate')}
          <Form.Control id={rateId} inputMode="decimal" type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={monthsId}>{mode === 'loan' ? t('loan.loanTerm') : t('loan.savingsTerm')}
          <Form.Control id={monthsId} inputMode="numeric" type="number" min="1" max={mode === 'loan' ? 600 : 120} value={months} onChange={(event) => setMonths(event.target.value)} />
        </label>
        {mode === 'loan' ? <label className="erp-flow-field__label">{t('loan.method')}
          <Form.Select value={method} onChange={(event) => setMethod(event.target.value as LoanMethod)}>
            <option value="annuity">{t('loan.methods.annuity')}</option><option value="equal-principal">{t('loan.methods.equalPrincipal')}</option>
          </Form.Select>
        </label> : <label className="erp-flow-field__label">{t('loan.renewals')}
          <Form.Control type="number" min="1" max="100" value={renewals} onChange={(event) => setRenewals(event.target.value)} />
        </label>}
      </div>
    </ToolPanel>
  </ToolBoard>
}
