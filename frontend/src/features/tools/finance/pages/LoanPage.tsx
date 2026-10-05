import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { calculateLoan, calculateSavings, type LoanMethod } from '../utils/loan'

export default function LoanPage() {
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
    <p className="erp-tool-result__label">{mode === 'loan' ? 'Tổng phải trả' : 'Số dư cuối kỳ'}</p>
    <p className="erp-tool-result__value">{schedule ? `${formatNumber(Math.round(schedule.totalPayment))} đ` : savings ? `${formatNumber(Math.round(savings.total))} đ` : '—'}</p>
    {schedule ? <>
      <p className="erp-tool-result__note">Lãi: {formatNumber(Math.round(schedule.totalInterest))} đ</p>
      <p className="erp-tool-result__note">Kỳ đầu: {formatNumber(Math.round(schedule.rows[0].payment))} đ</p>
      <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={downloadSchedule}>Tải bảng CSV</button>
      <div className="table-responsive mt-3"><table className="table table-sm"><thead><tr><th>Kỳ</th><th>Gốc</th><th>Lãi</th><th>Còn nợ</th></tr></thead><tbody>
        {schedule.rows.map((row) => <tr key={row.month}><td>{row.month}</td><td>{formatNumber(Math.round(row.principal))}</td><td>{formatNumber(Math.round(row.interest))}</td><td>{formatNumber(Math.round(row.balance))}</td></tr>)}
      </tbody></table></div>
    </> : savings ? <p className="erp-tool-result__note">Lãi {formatNumber(Math.round(savings.interest))} đ sau {savings.months} tháng. Mỗi kỳ tính lãi đơn, cuối kỳ nhập lãi vào gốc khi tái tục.</p> : <p className="erp-tool-result__note">Nhập số tiền dương, lãi suất không âm và thời hạn hợp lệ.</p>}
    <p className="erp-tool-result__note">Kết quả tham khảo; lịch thực tế phụ thuộc hợp đồng và cách làm tròn của bên cho vay.</p>
  </div>}>
    <ToolPanel title={mode === 'loan' ? 'Khoản vay' : 'Tiền gửi'}>
      <label className="erp-flow-field__label">Chế độ
        <Form.Select value={mode} onChange={(event) => setMode(event.target.value as 'loan' | 'savings')}>
          <option value="loan">Vay trả góp</option><option value="savings">Tiết kiệm tái tục</option>
        </Form.Select>
      </label>
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={principalId}>{mode === 'loan' ? 'Số tiền vay' : 'Số tiền gửi'} (đ)
          <Form.Control id={principalId} inputMode="decimal" type="number" min="1" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={rateId}>Lãi suất năm (%)
          <Form.Control id={rateId} inputMode="decimal" type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={monthsId}>{mode === 'loan' ? 'Thời hạn' : 'Kỳ hạn'} (tháng)
          <Form.Control id={monthsId} inputMode="numeric" type="number" min="1" max={mode === 'loan' ? 600 : 120} value={months} onChange={(event) => setMonths(event.target.value)} />
        </label>
        {mode === 'loan' ? <label className="erp-flow-field__label">Cách trả gốc
          <Form.Select value={method} onChange={(event) => setMethod(event.target.value as LoanMethod)}>
            <option value="annuity">Tổng trả gần bằng nhau</option><option value="equal-principal">Gốc bằng nhau</option>
          </Form.Select>
        </label> : <label className="erp-flow-field__label">Số lần tái tục
          <Form.Control type="number" min="1" max="100" value={renewals} onChange={(event) => setRenewals(event.target.value)} />
        </label>}
      </div>
    </ToolPanel>
  </ToolBoard>
}
