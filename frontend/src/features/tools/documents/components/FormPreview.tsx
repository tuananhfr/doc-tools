import type { FormKind } from '../config/form-templates'
import { FORM_TEMPLATES } from '../config/form-templates'

interface Props { kind: FormKind; values: Record<string, string> }
const value = (values: Record<string, string>, key: string) => values[key]?.trim() || '…………'

export function FormPreview({ kind, values }: Props) {
  const date = new Date()
  const template = FORM_TEMPLATES[kind]
  const signatures = kind === 'leave' ? ['Người duyệt', 'Người làm đơn'] : kind === 'authorization' ? ['Người được ủy quyền', 'Người ủy quyền'] : ['Bên nhận', 'Bên giao']
  return <article className="cn-form-print" style={{ background: '#fff', color: '#111', padding: 'clamp(20px, 4vw, 48px)', fontFamily: 'Times New Roman, serif', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
    <header style={{ textAlign: 'center', fontWeight: 700 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br /><span style={{ textDecoration: 'underline' }}>Độc lập - Tự do - Hạnh phúc</span></header>
    <p style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 20 }}>{value(values, 'place')}, ngày {date.getDate()} tháng {date.getMonth() + 1} năm {date.getFullYear()}</p>
    <h2 style={{ textAlign: 'center', margin: '28px 0' }}>{template.name.toUpperCase()}</h2>
    {kind === 'leave' ? <>
      <p>Kính gửi: {value(values, 'recipient')}</p>
      <p>Tôi tên là: <strong>{value(values, 'name')}</strong><br />Chức vụ, bộ phận: {value(values, 'department')}</p>
      <p>Nay tôi làm đơn này xin được nghỉ phép từ ngày {value(values, 'from')} đến hết ngày {value(values, 'to')}.</p>
      <p>Lý do: {value(values, 'reason')}</p>
      <p>Trong thời gian nghỉ, tôi bàn giao công việc cho {value(values, 'handover')}.</p>
      <p>Kính mong được xem xét, chấp thuận. Tôi xin chân thành cảm ơn.</p>
    </> : kind === 'authorization' ? <>
      <p><strong>Bên ủy quyền:</strong> {value(values, 'fromName')}<br />Số định danh cá nhân: {value(values, 'fromId')}<br />Địa chỉ: {value(values, 'fromAddress')}</p>
      <p><strong>Bên được ủy quyền:</strong> {value(values, 'toName')}<br />Số định danh cá nhân: {value(values, 'toId')}<br />Địa chỉ: {value(values, 'toAddress')}</p>
      <p><strong>Nội dung ủy quyền:</strong> {value(values, 'scope')}</p>
      <p><strong>Thời hạn:</strong> {value(values, 'term')}</p>
      <p>Hai bên cam kết chịu trách nhiệm về nội dung ủy quyền đã ghi.</p>
    </> : <>
      <p>Hôm nay, chúng tôi gồm:</p><p><strong>Bên giao:</strong> {value(values, 'giver')}<br /><strong>Bên nhận:</strong> {value(values, 'receiver')}</p>
      <p>Cùng tiến hành bàn giao các nội dung sau:</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ border: '1px solid #555', padding: 6 }}>STT</th><th style={{ border: '1px solid #555', padding: 6 }}>Nội dung</th></tr></thead><tbody>{(values.items?.trim().split('\n').filter(Boolean) || ['…………']).map((item, index) => <tr key={index}><td style={{ border: '1px solid #555', padding: 6 }}>{index + 1}</td><td style={{ border: '1px solid #555', padding: 6 }}>{item}</td></tr>)}</tbody></table>
      <p>Ghi chú: {value(values, 'note')}</p><p>Biên bản lập thành 02 bản, mỗi bên giữ 01 bản.</p>
    </>}
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 42, textAlign: 'center' }}>{signatures.map((signature) => <div key={signature} style={{ minWidth: '38%' }}><strong>{signature.toUpperCase()}</strong><br /><em>(Ký, ghi rõ họ tên)</em></div>)}</div>
  </article>
}
