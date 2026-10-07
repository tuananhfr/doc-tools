import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import type { SourceFile } from '../types/doc-tools.types'

interface ReplacePageModalProps {
  source: SourceFile
  targetPosition: number
  onCancel: () => void
  onConfirm: (pageIndex: number) => void
}

/** Tệp thay thế có nhiều trang → hỏi lấy trang nào, không tự chọn trang 1. */
export function ReplacePageModal({ source, targetPosition, onCancel, onConfirm }: ReplacePageModalProps) {
  const { t } = useTranslation('pdf')
  const [value, setValue] = useState('1')
  const page = Number(value)
  const valid = Number.isInteger(page) && page >= 1 && page <= source.pageCount

  return (
    <Modal show onHide={onCancel} centered>
      <Form
        onSubmit={(event) => {
          event.preventDefault()
          if (valid) onConfirm(page - 1)
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="fs-5">
            {t('replacePage.title', { position: targetPosition })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <Trans ns="pdf" i18nKey="replacePage.body" count={source.pageCount} values={{ name: source.name }} components={{ strong: <strong /> }} />
          </p>
          <Form.Group controlId="doc-replace-page">
            <Form.Label>{t('replacePage.label')}</Form.Label>
            <Form.Control
              type="number"
              inputMode="numeric"
              min={1}
              max={source.pageCount}
              value={value}
              isInvalid={!valid}
              autoFocus
              onChange={(event) => setValue(event.target.value)}
            />
            <Form.Control.Feedback type="invalid">{t('replacePage.invalid', { max: source.pageCount })}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onCancel}>
            {t('shared.cancel')}
          </Button>
          <Button type="submit" disabled={!valid}>
            {t('toolbar.replace')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
