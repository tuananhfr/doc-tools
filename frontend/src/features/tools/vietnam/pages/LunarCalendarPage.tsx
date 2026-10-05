import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { canChi, lunarToSolar, solarToLunar, type CalendarDate } from '../utils/lunar-calendar'

const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
const toDate = (value: string): CalendarDate => { const [year, month, day] = value.split('-').map(Number); return { day, month, year } }
const formatDate = (value: CalendarDate | null) => value ? `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')}/${value.year}` : 'Ngày không hợp lệ'
const formatLunar = (value: ReturnType<typeof solarToLunar>) => value ? `${value.day}/${value.month}${value.leap ? ' nhuận' : ''}/${value.year}` : 'Ngày không hợp lệ'

export default function LunarCalendarPage() {
  const [solarInput, setSolarInput] = useState(todayInVietnam)
  const today = solarToLunar(toDate(todayInVietnam()))
  const solarResult = solarToLunar(toDate(solarInput))
  const [lunarInput, setLunarInput] = useState({ day: '15', month: '8', year: String(today?.year ?? new Date().getFullYear()), leap: false })
  const lunarResult = lunarToSolar({ day: Number(lunarInput.day), month: Number(lunarInput.month), year: Number(lunarInput.year), leap: lunarInput.leap })
  const [anniversary, setAnniversary] = useState({ day: '10', month: '3', leap: false })
  const anniversaries = today ? [today.year, today.year + 1].map((year) => ({ year, solar: lunarToSolar({ day: Number(anniversary.day), month: Number(anniversary.month), year, leap: anniversary.leap }) })) : []
  const nextTet = today ? lunarToSolar({ day: 1, month: 1, year: today.year + 1 }) : null
  const vietnamToday = toDate(todayInVietnam())
  const daysToTet = nextTet ? Math.round((Date.UTC(nextTet.year, nextTet.month - 1, nextTet.day) - Date.UTC(vietnamToday.year, vietnamToday.month - 1, vietnamToday.day)) / 86400000) : null

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Ngày đã chọn</p>
    <p className="erp-tool-result__value">Âm lịch {formatLunar(solarResult)}</p>
    {solarResult ? <p className="erp-tool-result__note">Ngày {canChi(solarResult).day} · tháng {canChi(solarResult).month} · năm {canChi(solarResult).year}</p> : null}
    <hr />
    <p className="erp-tool-result__label">Âm → Dương</p>
    <p className="erp-tool-result__value">{formatDate(lunarResult)}</p>
    {nextTet ? <p className="erp-tool-result__note">Tết âm lịch tiếp theo: {formatDate(nextTet)}{daysToTet !== null ? ` · còn ${daysToTet} ngày` : ''}.</p> : null}
    <p className="erp-tool-result__note">Thuật toán thiên văn cho múi giờ Việt Nam UTC+7, phù hợp tham khảo sinh hoạt; đối chiếu lịch được cơ quan có thẩm quyền công bố khi dùng cho việc chính thức.</p>
    <a href="https://xemamlich.uhm.vn/vncal.html" target="_blank" rel="noopener noreferrer">Nguồn thuật toán Hồ Ngọc Đức</a>
  </div>}>
    <ToolPanel title="Đổi ngày dương – âm">
      <label className="erp-flow-field__label">Ngày dương lịch<Form.Control type="date" min="1800-01-01" max="2199-12-31" value={solarInput} onChange={(event) => setSolarInput(event.target.value)} /></label>
      <div className="erp-tool-form__grid mt-3">{([
        ['day', 'Ngày âm'], ['month', 'Tháng âm'], ['year', 'Năm âm'],
      ] as [keyof Pick<typeof lunarInput, 'day' | 'month' | 'year'>, string][]).map(([key, label]) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min={key === 'year' ? 1800 : 1} max={key === 'day' ? 30 : key === 'month' ? 12 : 2199} step="1" value={lunarInput[key]} onChange={(event) => setLunarInput((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
      <Form.Check className="mt-3" label="Tháng nhuận" checked={lunarInput.leap} onChange={(event) => setLunarInput((current) => ({ ...current, leap: event.target.checked }))} />
      <h3 className="h6 mt-4">Ngày giỗ theo âm lịch</h3>
      <div className="erp-tool-form__grid">{([
        ['day', 'Ngày'], ['month', 'Tháng'],
      ] as [keyof Pick<typeof anniversary, 'day' | 'month'>, string][]).map(([key, label]) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min="1" max={key === 'day' ? 30 : 12} step="1" value={anniversary[key]} onChange={(event) => setAnniversary((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
      <Form.Check className="mt-3" label="Tháng nhuận" checked={anniversary.leap} onChange={(event) => setAnniversary((current) => ({ ...current, leap: event.target.checked }))} />
      <ul className="mt-3">{anniversaries.map(({ year, solar }) => <li key={year}>Năm âm {year}: {formatDate(solar)}</li>)}</ul>
    </ToolPanel>
  </ToolBoard>
}
