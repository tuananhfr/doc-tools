import { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { CvPreview } from '../components/CvPreview'
import { emptyCv, emptyEntry, parseCvDraft, type CvDraft, type CvEntry } from '../models/cv'

const storageKey = 'chuyen-nho-cv-draft-v1'
const identityFields = [
  ['name', 'Họ và tên'], ['role', 'Vị trí ứng tuyển'], ['phone', 'Số điện thoại'], ['email', 'Email'],
  ['location', 'Nơi ở'], ['link', 'Portfolio hoặc LinkedIn'],
] as const

function EntryEditor({ title, entries, onChange }: { title: string; entries: CvEntry[]; onChange: (entries: CvEntry[]) => void }) {
  const update = (index: number, key: keyof CvEntry, value: string) => onChange(entries.map((entry, position) => position === index ? { ...entry, [key]: value } : entry))
  return <fieldset className="mt-4"><legend className="h6">{title}</legend>{entries.map((entry, index) => <div className="border rounded p-3 mb-3" key={index}>
    {([['period', 'Thời gian'], ['organization', title === 'Kinh nghiệm' ? 'Công ty' : 'Trường'], ['title', title === 'Kinh nghiệm' ? 'Vị trí' : 'Ngành / bằng cấp']] as const).map(([key, label]) => <label className="erp-flow-field__label mb-2" key={key}>{label}<Form.Control value={entry[key]} maxLength={200} onChange={(event) => update(index, key, event.target.value)} /></label>)}
    <label className="erp-flow-field__label">Mô tả / thành tích<Form.Control as="textarea" rows={3} maxLength={2000} value={entry.description} onChange={(event) => update(index, 'description', event.target.value)} /></label>
    <Button variant="outline-danger" size="sm" className="mt-2" onClick={() => onChange(entries.filter((_, position) => position !== index))}>Xóa mục</Button>
  </div>)}<Button variant="outline-secondary" size="sm" disabled={entries.length >= 12} onClick={() => onChange([...entries, emptyEntry()])}>Thêm mục</Button></fieldset>
}

export default function CvPage() {
  const [draft, setDraft] = useState<CvDraft>(emptyCv)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  const update = (key: keyof CvDraft, value: CvDraft[typeof key]) => setDraft((current) => ({ ...current, [key]: value }))
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(draft)); setMessage('Đã lưu bản nháp trên thiết bị này; ảnh không được lưu.') } catch { setMessage('Không lưu được bản nháp trên thiết bị.') } }
  const load = () => { try { const value = parseCvDraft(JSON.parse(localStorage.getItem(storageKey) || 'null')); if (!value) { setMessage('Chưa có bản nháp hợp lệ.'); return } setDraft(value); setMessage('Đã mở bản nháp.'); } catch { setMessage('Bản nháp không đọc được.') } }
  const clear = () => { localStorage.removeItem(storageKey); setDraft(emptyCv()); setPhotoUrl(null); setMessage('Đã xóa bản nháp trên thiết bị.') }
  return <>
    <style>{`.cn-cv-layout{display:grid;grid-template-columns:minmax(290px,.8fr) minmax(0,1.2fr);gap:24px;align-items:start}.cn-cv-print{background:#fff;color:#202c3a;min-height:297mm;padding:18mm 19mm;box-shadow:0 3px 25px #0001;font:14px/1.55 Arial,sans-serif;overflow-wrap:anywhere}.cn-cv-header{display:flex;justify-content:space-between;gap:20px;align-items:start}.cn-cv-header h1{font-size:32px;margin:0 0 4px;font-weight:700}.cn-cv-header img{width:28mm;height:36mm;object-fit:cover}.cn-cv-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:10px;margin:0 0 6px;color:#64748b}.cn-cv-role{font-size:17px;margin:0}.cn-cv-contact{display:flex;gap:5px 14px;flex-wrap:wrap;border-bottom:1px solid #ccd5de;padding:14px 0}.cn-cv-section{margin-top:22px;break-inside:avoid}.cn-cv-section h2{font-size:14px;text-transform:uppercase;letter-spacing:.09em;border-bottom:1px solid #ccd5de;padding-bottom:5px;margin-bottom:10px}.cn-cv-entry{display:grid;grid-template-columns:95px 1fr;gap:14px;margin:10px 0;break-inside:avoid}.cn-cv-entry__period{color:#596777}.cn-cv--modern{border-top:8px solid #183d45}.cn-cv--modern .cn-cv-section h2{color:#17605b;border-color:#17605b}@media(max-width:1000px){.cn-cv-layout{grid-template-columns:1fr}}@media(max-width:600px){.cn-cv-print{padding:24px;min-height:0}.cn-cv-entry{grid-template-columns:1fr;gap:0}}@media print{@page{size:A4;margin:0}body *{visibility:hidden!important}.cn-cv-print,.cn-cv-print *{visibility:visible!important}.cn-cv-print{position:absolute;left:0;top:0;width:210mm;min-height:297mm;box-shadow:none!important;page-break-after:auto}}`}</style>
    <ToolBoard><div className="cn-cv-layout"><ToolPanel title="Soạn CV">
      <div className="d-flex flex-wrap gap-2"><Button variant="outline-secondary" size="sm" onClick={save}>Lưu bản nháp</Button><Button variant="outline-secondary" size="sm" onClick={load}>Mở bản nháp</Button><Button variant="outline-danger" size="sm" onClick={clear}>Xóa bản nháp</Button></div>
      <label className="erp-flow-field__label mt-3">Mẫu CV<Form.Select value={draft.template} onChange={(event) => update('template', event.target.value as CvDraft['template'])}><option value="classic">Cổ điển</option><option value="modern">Hiện đại</option></Form.Select></label>
      {identityFields.map(([key, label]) => <label className="erp-flow-field__label mt-3" key={key}>{label}<Form.Control type={key === 'email' ? 'email' : 'text'} maxLength={200} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <label className="erp-flow-field__label mt-3">Ảnh chân dung (chỉ trong phiên hiện tại)<Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null) }} /></label>
      <label className="erp-flow-field__label mt-3">Giới thiệu ngắn<Form.Control as="textarea" rows={4} maxLength={3000} value={draft.summary} onChange={(event) => update('summary', event.target.value)} /></label>
      <EntryEditor title="Kinh nghiệm" entries={draft.experience} onChange={(value) => update('experience', value)} /><EntryEditor title="Học vấn" entries={draft.education} onChange={(value) => update('education', value)} />
      {([['skills', 'Kỹ năng'], ['languages', 'Ngoại ngữ'], ['certificates', 'Chứng chỉ']] as const).map(([key, label]) => <label className="erp-flow-field__label mt-3" key={key}>{label}<Form.Control as="textarea" rows={3} maxLength={3000} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <Button className="mt-3" onClick={() => window.print()}>In / Lưu PDF</Button><p role="status" className="mt-2">{message}</p>
    </ToolPanel><div><CvPreview draft={draft} photoUrl={photoUrl} /><p className="mt-3">Xem kỹ thông tin trước khi gửi. Bản nháp chỉ lưu trên thiết bị khi bạn bấm Lưu; ảnh không được lưu.</p></div></div></ToolBoard>
  </>
}
