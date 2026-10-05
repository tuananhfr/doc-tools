import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { exportFamilyIcs, parseFamilyBackup } from '../core/portability'
import type { FamilySpace } from '../core/family'

interface Props { space: FamilySpace; onRestore: (value: FamilySpace) => Promise<void>; onPrint: (includeSensitive: boolean) => void; disabled: boolean }

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function FamilyPortability({ space, onRestore, onPrint, disabled }: Props) {
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const [candidate, setCandidate] = useState<FamilySpace | null>(null)
  const [error, setError] = useState('')
  const inspect = async (file: File | undefined) => {
    setCandidate(null)
    if (!file || file.size > 20_000_000) { setError('Tệp sao lưu không hợp lệ hoặc quá 20 MB.'); return }
    const parsed = parseFamilyBackup(await file.text())
    if (!parsed) { setError('Không đọc được bản sao lưu đúng phiên bản.'); return }
    setCandidate(parsed); setError('')
  }
  const restore = async () => {
    if (!candidate || !window.confirm(`Khôi phục gia đình ${candidate.familyId} với ${candidate.events.length} lịch? Dữ liệu đang dùng vẫn được giữ trong bộ nhớ thiết bị để có thể mở lại.`)) return
    try { await onRestore(candidate); setCandidate(null); setError('') }
    catch { setError('Không khôi phục được. Dữ liệu đang dùng vẫn còn.') }
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">Sao lưu và xuất lịch</h2>
    <p>Bản sao lưu JSON giữ thành viên, lịch, nhắc việc và tín hiệu SOS. Tệp ICS chỉ dùng để đưa lịch sang ứng dụng khác; không thay bản sao lưu.</p>
    <div className="d-flex flex-wrap gap-2"><Button variant="outline-secondary" onClick={() => download(JSON.stringify(space, null, 2), 'application/json;charset=utf-8', 'lich-gia-dinh-backup.json')}>Tải bản sao lưu</Button><Button variant="outline-secondary" onClick={() => download(exportFamilyIcs(space, includeSensitive), 'text/calendar;charset=utf-8', 'lich-gia-dinh.ics')}>Tải ICS</Button><Button variant="outline-secondary" onClick={() => onPrint(includeSensitive)}>In / Lưu PDF 30 ngày tới</Button></div>
    <Form.Check className="mt-3" label="Gồm cả lịch riêng tư và nhạy cảm trong ICS/PDF" checked={includeSensitive} onChange={(event) => setIncludeSensitive(event.target.checked)} />
    <p className="small">ICS và PDF mặc định bỏ lịch riêng tư, nhạy cảm. Bản sao lưu luôn gồm đầy đủ dữ liệu; giữ tệp ở nơi bạn tin cậy.</p>
    <label className="erp-flow-field__label mt-3">Khôi phục từ bản sao lưu JSON<Form.Control type="file" accept=".json,application/json" onChange={(event) => void inspect((event.target as HTMLInputElement).files?.[0])} /></label>
    {candidate ? <div className="mt-3"><p>Đã đọc: {candidate.members.length} thành viên, {candidate.events.length} lịch, {candidate.reminders.length} nhắc việc. Mã gia đình: {candidate.familyId}.</p><Button disabled={disabled} onClick={() => void restore()}>Khôi phục bản này</Button></div> : null}
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
