import { useId, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { CopyButton, downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { QrPreview } from '../components/QrPreview'
import { qrPngBlob, qrSvgBlob } from '../services/qr-render'
import { createMatrix } from '../utils/qr-matrix'
import { buildVietQr } from '../utils/vietqr'

export default function VietQrPage() {
  const ids = [useId(), useId(), useId(), useId()]
  const [bin, setBin] = useState('')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const payload = buildVietQr({ bin, account, amount, note })
  const matrix = useMemo(() => payload ? createMatrix(payload) : null, [payload])

  const download = async (format: 'png' | 'svg') => {
    if (!matrix) return
    const blob = format === 'png' ? await qrPngBlob(matrix, '#102e57') : qrSvgBlob(matrix, '#102e57')
    downloadOutput({ name: `vietqr-${bin}-${account}.${format}`, blob })
  }

  return <ToolBoard side={<>
    <QrPreview matrix={matrix} color="#102e57" placeholder="Nhập mã BIN và số tài khoản để tạo mã" />
    {payload ? <div className="erp-flow-field"><span className="erp-flow-field__label">Nội dung trong mã</span><p className="erp-qr-payload">{payload}</p><CopyButton text={payload} label="Chép chuỗi QR" /></div> : null}
    <div className="d-flex flex-wrap gap-2 mt-3"><Button disabled={!matrix} onClick={() => void download('png')}>Tải PNG</Button><Button variant="outline-secondary" disabled={!matrix} onClick={() => void download('svg')}>Tải SVG</Button></div>
    <p className="erp-tool-result__note mt-3">Quét thử bằng ứng dụng ngân hàng và kiểm tra tên người nhận, số tài khoản, số tiền trước khi sử dụng.</p>
  </>} sideLabel="Mã chuyển khoản">
    <ToolPanel title="Thông tin chuyển khoản">
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={ids[0]}>Mã BIN ngân hàng (6 số)
          <Form.Control id={ids[0]} inputMode="numeric" maxLength={6} value={bin} onChange={(event) => setBin(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[1]}>Số tài khoản
          <Form.Control id={ids[1]} inputMode="numeric" maxLength={30} value={account} onChange={(event) => setAccount(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[2]}>Số tiền (đ), có thể để trống
          <Form.Control id={ids[2]} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[3]}>Nội dung chuyển khoản
          <Form.Control id={ids[3]} maxLength={50} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <p className="erp-tool-result__note mt-3">Mã được tạo trên máy bạn; thông tin tài khoản không gửi tới máy chủ của Chuyện Nhỏ.</p>
    </ToolPanel>
  </ToolBoard>
}
