import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon, useToast } from '@/components/ui'
import { CopyButton, downloadOutput, ToolBoard, ToolPanel, useDownloadNudge } from '@/features/tools/hub'
import { QrColorPicker } from '../components/QrColorPicker'
import { QrContentForm } from '../components/QrContentForm'
import { QrModeTabs } from '../components/QrModeTabs'
import { QrPreview } from '../components/QrPreview'
import { QR_COLORS, qrBackgroundColor, qrContrast, type QrBackground } from '../config/qr-colors'
import { qrPdfBlob, qrPngBlob, qrSvgBlob } from '../services/qr-render'
import type { QrForm } from '../types/qr.types'
import { qrFileName } from '../utils/qr-file-name'
import { createMatrix } from '../utils/qr-matrix'
import { buildPayload, INITIAL_QR_FORM } from '../utils/qr-payload'

const TOO_LONG = 'Nội dung dài quá sức chứa của một mã QR. Rút gọn lại, hoặc dùng đường dẫn tới nơi chứa nội dung.'

/**
 * TẠO MÃ QR — mã vẽ lại theo từng phím gõ, không có nút "Tạo". Thứ nằm trong mã
 * được in ra nguyên văn bên dưới: người dùng thấy đúng chuỗi mà máy quét sẽ đọc.
 */
export default function QrCreatePage() {
  const toast = useToast()
  const nudge = useDownloadNudge()
  const [form, setForm] = useState<QrForm>(INITIAL_QR_FORM)
  const [colorId, setColorId] = useState(QR_COLORS[0].id)
  const [background, setBackground] = useState<QrBackground>({ mode: 'white', color: '#ffffff' })

  const payload = buildPayload(form)
  const text = payload.ok ? payload.text : null
  const matrix = useMemo(() => (text === null ? null : createMatrix(text)), [text])
  const color = (QR_COLORS.find((item) => item.id === colorId) ?? QR_COLORS[0]).value
  const backgroundColor = qrBackgroundColor(background)

  const tooLong = text !== null && matrix === null
  const error = tooLong ? TOO_LONG : payload.ok ? null : payload.reason

  const download = async (type: 'png' | 'svg' | 'pdf') => {
    if (!matrix) return
    try {
      const blob = type === 'png' ? await qrPngBlob(matrix, color, backgroundColor)
        : type === 'svg' ? qrSvgBlob(matrix, color, backgroundColor)
          : await qrPdfBlob(matrix, color, backgroundColor)
      downloadOutput({ name: `${qrFileName(form)}.${type}`, blob })
      nudge.onDownloaded()
    } catch {
      toast.error('Không dựng được ảnh mã QR. Thử lại.')
    }
  }

  return (
    <ToolBoard
      sideLabel="Mã QR"
      side={
        <>
          <QrPreview matrix={matrix} color={color} background={backgroundColor} placeholder={error ? 'Chưa tạo được mã' : 'Nhập nội dung để tạo mã'} />

          {text !== null && matrix ? (
            <div className="erp-flow-field">
              <span className="erp-flow-field__label">Nội dung trong mã</span>
              <p className="erp-qr-payload">{text}</p>
              <CopyButton text={text} size="sm" className="align-self-start" />
            </div>
          ) : null}

          <Button variant="primary" className="erp-flow__run" disabled={!matrix} onClick={() => void download('png')}>
            <Icon name="download" className="me-2" />
            Tải mã QR
          </Button>
          <Button variant="outline-secondary" disabled={!matrix} onClick={() => void download('svg')}>
            <Icon name="vector-pen" className="me-2" />
            Tải bản SVG để in
          </Button>
          <Button variant="outline-secondary" disabled={!matrix} onClick={() => void download('pdf')}>
            <Icon name="file-earmark-pdf" className="me-2" />
            Tải bản PDF
          </Button>
          {nudge.extra}
        </>
      }
    >
      <QrModeTabs current="qr-create" />
      <ToolPanel title="Nội dung mã">
        <QrContentForm form={form} error={error} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
        <QrColorPicker value={colorId} onChange={setColorId} background={background} onBackgroundChange={setBackground} />
        {backgroundColor === null ? <p className="erp-flow-field__hint">Khi ghép lên ảnh, chọn vùng đủ sáng và đồng màu để mã dễ quét.</p>
          : qrContrast(color, backgroundColor) < 4.5 ? <p className="erp-flow-field__hint">Màu mã và màu nền quá gần nhau; hãy tăng tương phản để dễ quét.</p> : null}
      </ToolPanel>
    </ToolBoard>
  )
}
