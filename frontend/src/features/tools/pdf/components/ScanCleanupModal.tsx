import { useRef } from 'react'
import { Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { SourceFile } from '../types/doc-tools.types'
import { usePageThumbnail } from '../hooks/usePageThumbnail'
import type { ScanCleanup } from '../hooks/useScanCleanup'
import type { ScanChoice, ScanItem } from '../utils/scan-plan'
import { PageSheet } from './PageSheet'

interface ScanCleanupModalProps {
  cleanup: ScanCleanup
  sources: Record<string, SourceFile>
  /** Số trang cả tài liệu — không cho xoá hết. */
  pageCount: number
  onApply: () => void
}

const SECTIONS: { choice: ScanChoice; icon: string; title: string; action: string }[] = [
  { choice: 'blank', icon: 'file-earmark', title: 'Trang trắng', action: 'Bỏ khỏi tài liệu.' },
  { choice: 'skew', icon: 'arrow-repeat', title: 'Trang nghiêng', action: 'Xoay lại cho thẳng dòng chữ.' },
  { choice: 'crop', icon: 'crop', title: 'Viền tối quanh tờ giấy', action: 'Cắt về mép tờ giấy.' },
]

const angleText = (skew: number) => `nghiêng ${Math.abs(skew).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}°`

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
          Dọn bản scan
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {phase === 'analyzing' ? (
          <div className="erp-doc-scan__progress" role="status">
            <p className="mb-2">
              Đang soi trang {Math.min(progress.done + 1, progress.total)}/{progress.total}…
            </p>
            <ProgressBar now={progress.total ? (progress.done / progress.total) * 100 : 0} aria-hidden />
          </div>
        ) : nothing ? (
          <p className="erp-doc-scan__empty mb-0">
            <Icon name="check-circle" className="me-2" />
            Không thấy trang trắng, trang nghiêng hay viền tối.
          </p>
        ) : (
          SECTIONS.map(({ choice, icon, title, action }) => {
            const items = groups[choice]
            if (items.length === 0) return null
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
                            aria-label={`${title}: trang ${item.position}`}
                          />
                          <span>
                            Trang {item.position}
                            {choice === 'skew' && item.scan.skew !== null ? <small className="d-block">{angleText(item.scan.skew)}</small> : null}
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
            {groups.skipped > 0
              ? `Bỏ qua ${groups.skipped} trang đã có lớp chữ (PDF số, đã nhận dạng chữ) hoặc trang gộp ảnh — xoay, cắt sẽ làm lệch lớp chữ. `
              : ''}
            {failed > 0 ? `${failed} trang không đọc được.` : ''}
          </p>
        ) : null}
        {phase !== 'analyzing' && plan.fixes.size > 0 ? (
          <p className="erp-doc-export__note mt-2 mb-0">Trang chỉnh nghiêng, cắt viền thành bản mới — Hoàn tác (Ctrl+Z) để lấy lại bản cũ.</p>
        ) : null}
        {removesAll ? <p className="erp-doc-scan__warn mt-2 mb-0">Không xoá được hết mọi trang của tài liệu — bỏ chọn ít nhất một trang trắng.</p> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={busy} onClick={close}>
          {phase === 'analyzing' ? 'Huỷ' : 'Đóng'}
        </Button>
        {phase !== 'analyzing' && !nothing ? (
          <Button disabled={busy || total === 0 || removesAll} onClick={onApply}>
            {busy ? <Spinner as="span" size="sm" className="me-2" aria-hidden /> : <Icon name="check-lg" className="me-2" />}
            {total > 0 ? `Áp dụng ${total} thay đổi` : 'Chưa chọn gì'}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  )
}
