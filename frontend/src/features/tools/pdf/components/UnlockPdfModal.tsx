import { useState } from 'react'
import type { TFunction } from 'i18next'
import { Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
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

const ERROR_TEXT: Record<UnlockError, (owner: boolean, t: TFunction<'pdf'>) => string> = {
  'wrong-password': (owner, t) => (owner ? t('unlock.wrongOwner') : t('unlock.wrong')),
  restricted: (_owner, t) => t('unlock.restricted'),
  failed: (_owner, t) => t('unlock.failed'),
  unavailable: (_owner, t) => t('unlock.unavailable'),
}

/** Hỏi mật khẩu cho tệp PDF có khoá — giải mã ngay trên máy, mật khẩu không gửi đi đâu. */
export function UnlockPdfModal({ file, remaining, busy, onSubmit, onSkip }: UnlockPdfModalProps) {
  const { t } = useTranslation('pdf')
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
            {owner ? t('unlock.ownerTitle') : t('unlock.title')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <Trans ns="pdf" i18nKey={owner ? 'unlock.ownerBody' : 'unlock.body'} values={{ name: file.name }} components={{ strong: <strong /> }} />
          </p>
          <Form.Group controlId="doc-unlock-password">
            <Form.Label>{owner ? t('unlock.ownerPassword') : t('unlock.password')}</Form.Label>
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
              <Button variant="outline-secondary" onClick={() => setVisible((value) => !value)} aria-label={visible ? t('unlock.hide') : t('unlock.show')}>
                <Icon name={visible ? 'eye-slash' : 'eye'} />
              </Button>
              <Form.Control.Feedback type="invalid">{error ? ERROR_TEXT[error](owner, t) : null}</Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
          <p className="erp-doc-export__note mt-2 mb-0">
            {t('unlock.note')}
            {remaining > 1 ? t('unlock.remaining', { count: remaining - 1 }) : ''}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={busy} onClick={onSkip}>
            {t('unlock.skip')}
          </Button>
          <Button type="submit" disabled={busy || password === ''}>
            {busy ? <Spinner as="span" size="sm" className="me-2" aria-hidden /> : <Icon name="unlock" className="me-2" />}
            {t('unlock.submit')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
