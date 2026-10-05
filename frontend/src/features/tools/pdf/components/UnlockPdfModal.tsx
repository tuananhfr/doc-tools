import { useState } from 'react'
import { Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { LockedFile } from '../hooks/useDocWorkspace'
import type { UnlockError } from '../hooks/useUnlockQueue'

interface UnlockPdfModalProps {
  file: LockedFile
  /** Kể cả tệp đang hỏi. */
  remaining: number
  busy: boolean
  onSubmit: (password: string) => Promise<UnlockError | null>
  onSkip: () => void
}

const ERROR_TEXT: Record<UnlockError, (owner: boolean) => string> = {
  'wrong-password': (owner) => (owner ? 'Sai mật khẩu chủ. Thử lại.' : 'Sai mật khẩu. Thử lại.'),
  restricted: () => 'Đây là mật khẩu mở tệp. Tệp cấm sửa nên cần thêm mật khẩu chủ (owner) để dùng công cụ.',
  failed: () => 'Không mở khoá được tệp này.',
  unavailable: () => 'Không tải được bộ mở khoá PDF. Kiểm tra kết nối mạng rồi thử lại.',
}

/** Hỏi mật khẩu cho tệp PDF có khoá — giải mã ngay trên máy, mật khẩu không gửi đi đâu. */
export function UnlockPdfModal({ file, remaining, busy, onSubmit, onSkip }: UnlockPdfModalProps) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<UnlockError | null>(null)
  const owner = file.kind === 'owner'

  const submit = async () => {
    const result = await onSubmit(password)
    setError(result)
    if (result) setPassword('')
  }

  return (
    <Modal show onHide={busy ? undefined : onSkip} centered backdrop={busy ? 'static' : true}>
      <Form
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy) void submit()
        }}
      >
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="fs-5">
            <Icon name="lock" className="me-2" />
            {owner ? 'Tệp bị khoá quyền sửa' : 'Tệp có mật khẩu'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <strong>{file.name}</strong>{' '}
            {owner
              ? 'mở xem được nhưng người tạo đã cấm sửa, ghép trang. Nhập mật khẩu chủ (owner) để dùng công cụ — không có mật khẩu thì không gỡ được hạn chế.'
              : 'cần mật khẩu để mở.'}
          </p>
          <Form.Group controlId="doc-unlock-password">
            <Form.Label>{owner ? 'Mật khẩu chủ' : 'Mật khẩu'}</Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                type={visible ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                isInvalid={!!error}
                disabled={busy}
                autoFocus
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button variant="outline-secondary" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <Icon name={visible ? 'eye-slash' : 'eye'} />
              </Button>
              <Form.Control.Feedback type="invalid">{error ? ERROR_TEXT[error](owner) : null}</Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
          <p className="erp-doc-export__note mt-2 mb-0">
            Giải mã ngay trên máy bạn, mật khẩu không gửi đi. Tệp tải về sau đó sẽ không còn mật khẩu.
            {remaining > 1 ? ` Còn ${remaining - 1} tệp nữa cần mật khẩu.` : ''}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={busy} onClick={onSkip}>
            Bỏ qua tệp này
          </Button>
          <Button type="submit" disabled={busy || password === ''}>
            {busy ? <Spinner as="span" size="sm" className="me-2" aria-hidden /> : <Icon name="unlock" className="me-2" />}
            Mở khoá
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
