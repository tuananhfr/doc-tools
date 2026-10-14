import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

interface OfficeCloseDialogProps {
  show: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function OfficeCloseDialog({ show, onCancel, onConfirm }: OfficeCloseDialogProps) {
  const { t } = useTranslation('common')
  return (
    <Modal show={show} onHide={onCancel} centered aria-labelledby="cn-office-close-title">
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="fs-5" id="cn-office-close-title">{t('office.closeTitle')}</Modal.Title>
      </Modal.Header>
      <Modal.Body><p className="mb-0">{t('office.leave')}</p></Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" autoFocus onClick={onCancel}>{t('leave.stay')}</Button>
        <Button variant="danger" onClick={onConfirm}>{t('office.confirmClose')}</Button>
      </Modal.Footer>
    </Modal>
  )
}
