import { Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CardArtwork } from './CardArtwork'

export function CardImageDialog({ show, path, label, orientation, onClose }: { show: boolean; path: string; label: string; orientation?: 'UPRIGHT' | 'REVERSED'; onClose: () => void }) {
  const { t } = useTranslation('entertainment')
  return <Modal animation={false} show={show} onHide={onClose} centered aria-labelledby="cn-ent-artwork-title" dialogClassName="cn-ent-artwork-dialog">
    <Modal.Header closeButton closeLabel={t('artwork.close')}><Modal.Title id="cn-ent-artwork-title">{label}</Modal.Title></Modal.Header>
    <Modal.Body><div className="cn-ent-artwork-large"><CardArtwork path={path} label={label} reversed={orientation === 'REVERSED'} /></div>{orientation ? <p className="cn-ent-artwork-orientation">{t(orientation === 'REVERSED' ? 'cards.reversed' : 'cards.upright')}</p> : null}</Modal.Body>
  </Modal>
}
