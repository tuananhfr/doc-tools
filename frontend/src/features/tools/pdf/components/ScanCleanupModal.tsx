import { useRef } from 'react'
import { Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { SourceFile } from '../types/doc-tools.types'
import { usePageThumbnail } from '../hooks/usePageThumbnail'
import type { ScanCleanup } from '../hooks/useScanCleanup'
import type { ScanChoice, ScanItem } from '../utils/scan-plan'
import { PageSheet } from './PageSheet'
import { numberFormat } from '@/i18n/intl'

interface ScanCleanupModalProps {
  cleanup: ScanCleanup
  sources: Record<string, SourceFile>
  /** Số trang cả tài liệu — không cho xoá hết. */
  pageCount: number
  onApply: () => void
}

const SECTIONS: { choice: ScanChoice; icon: string }[] = [
  { choice: 'blank', icon: 'file-earmark' },
  { choice: 'skew', icon: 'arrow-repeat' },
  { choice: 'crop', icon: 'crop' },
]

const angleValue = (skew: number) => numberFormat({ maximumFractionDigits: 1 }).format(Math.abs(skew))

function ScanThumb({ item, source }: { item: ScanItem; source: SourceFile | undefined }) {
  const frame = useRef<HTMLDivElement>(null)
  const thumb = usePageThumbnail(frame, source, item.page)
  return (
    <div ref={frame} className="erp-doc-scan__thumb" aria-hidden>
      {thumb.status === 'ready' ? (
        <PageSheet url={thumb.url} base={thumb.base} rotation={item.page.rotation} overlay={() => null} />
      ) : thumb.status === 'loading' ? (
        <Spinner as="span" size="sm" />
      ) : (
        <Icon name="exclamation-triangle" />
      )}
    </div>
  )
}

/** Kết quả soi bản scan — mặc định chọn hết, người dùng bỏ chọn trang soi nhầm rồi mới áp dụng. */
export function ScanCleanupModal({ cleanup, sources, pageCount, onApply }: ScanCleanupModalProps) {
  const { t } = useTranslation('pdf')
  const { phase, progress, groups, failed, plan, isChosen, toggle, close } = cleanup
  const busy = phase === 'applying'
  const total = plan.remove.length + plan.fixes.size
  const removesAll = plan.remove.length >= pageCount
  const nothing = groups.blank.length + groups.skew.length + groups.crop.length === 0

  return (
    <Modal show onHide={busy ? undefined : close} centered scrollable size="lg" backdrop={busy ? 'static' : true}>
      <Modal.Header closeButton={!busy}>
        <Modal.Title as="h2" className="fs-5">
          <Icon name="magic" className="me-2" />
          {t('scan.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {phase === 'analyzing' ? (
          <div className="erp-doc-scan__progress" role="status">
            <p className="mb-2">
              {t('scan.analyzing', { page: Math.min(progress.done + 1, progress.total), total: progress.total })}
            </p>
            <ProgressBar now={progress.total ? (progress.done / progress.total) * 100 : 0} aria-hidden />
          </div>
        ) : nothing ? (
          <p className="erp-doc-scan__empty mb-0">
            <Icon name="check-circle" className="me-2" />
            {t('scan.nothing')}
          </p>
        ) : (
          SECTIONS.map(({ choice, icon }) => {
            const items = groups[choice]
            if (items.length === 0) return null
            const title = t(`scan.${choice}`)
            const action = t(`scan.${choice}Action`)
            return (
              <section key={choice} className="erp-doc-scan__section" aria-labelledby={`doc-scan-${choice}`}>
                <h3 id={`doc-scan-${choice}`} className="erp-doc-scan__title">
                  <Icon name={icon} className="me-2" />
                  {title} ({items.length})
                  <span className="erp-doc-scan__action">{action}</span>
                </h3>
                <ul className="erp-doc-scan__items">
                  {items.map((item) => (
                    <li key={item.page.id}>
                      <label className="erp-doc-scan__item">
                        <ScanThumb item={item} source={sources[item.page.sourceId]} />
                        <span className="erp-doc-scan__meta">
                          <Form.Check
                            className="erp-doc-scan__check"
                            checked={isChosen(item.page.id, choice)}
                            disabled={busy}
                            onChange={() => toggle(item.page.id, choice)}
                            aria-label={t('scan.itemLabel', { title, position: item.position })}
                          />
                          <span>
                            {t('scan.page', { position: item.position })}
                            {choice === 'skew' && item.scan.skew !== null ? <small className="d-block">{t('scan.angle', { angle: angleValue(item.scan.skew) })}</small> : null}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}

        {phase !== 'analyzing' && (groups.skipped > 0 || failed > 0) ? (
          <p className="erp-doc-export__note mt-3 mb-0">
            {groups.skipped > 0 ? t('scan.skipped', { count: groups.skipped }) : ''}
            {failed > 0 ? t('scan.failed', { count: failed }) : ''}
          </p>
        ) : null}
        {phase !== 'analyzing' && plan.fixes.size > 0 ? (
          <p className="erp-doc-export__note mt-2 mb-0">{t('scan.fixNote')}</p>
        ) : null}
        {removesAll ? <p className="erp-doc-scan__warn mt-2 mb-0">{t('scan.removesAll')}</p> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={busy} onClick={close}>
          {phase === 'analyzing' ? t('shared.cancel') : t('preview.close')}
        </Button>
        {phase !== 'analyzing' && !nothing ? (
          <Button disabled={busy || total === 0 || removesAll} onClick={onApply}>
            {busy ? <Spinner as="span" size="sm" className="me-2" aria-hidden /> : <Icon name="check-lg" className="me-2" />}
            {total > 0 ? t('scan.apply', { count: total }) : t('scan.noneChosen')}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  )
}
