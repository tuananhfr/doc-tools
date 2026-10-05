import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Overlay, Popover } from 'react-bootstrap'

interface ConfirmActionProps {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Hanh dong pha huy -> nut xac nhan dung semantic danger. */
  danger?: boolean
  onConfirm: () => void
  /** Nut kich hoat; nhan `onClick` tu component nay de mo hop xac nhan. */
  children: (props: { onClick: () => void }) => ReactNode
}

/**
 * Xac nhan tai cho truoc mot hanh dong (thay `Popconfirm` cua Ant Design).
 *
 * Hanh dong khong hoan tac duoc PHAI di qua lop nay - khong xoa ngay khi bam.
 */
export function ConfirmAction({
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger,
  onConfirm,
  children,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false)
  // Ref dang state: Overlay can doc phan tu neo NGAY trong lan render co show.
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)

  return (
    <>
      <span ref={setAnchor} className="d-inline-flex">
        {children({ onClick: () => setOpen((value) => !value) })}
      </span>

      <Overlay target={anchor} show={open} placement="left" rootClose onHide={() => setOpen(false)}>
        <Popover>
          <Popover.Header as="h3">{title}</Popover.Header>
          <Popover.Body>
            {description}
            <div className="erp-confirm__actions">
              <Button size="sm" variant="outline-secondary" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                variant={danger ? 'danger' : 'primary'}
                onClick={() => {
                  setOpen(false)
                  onConfirm()
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  )
}
