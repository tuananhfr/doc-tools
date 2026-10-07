import { useEffect } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { useToolsBranch } from '../hooks/tools-branch'
import { leavesToolScreen } from '../utils/tool-lookup'

interface ToolLeaveGuardProps {
  /** Công cụ đang giữ tệp chưa lưu ở đâu ngoài RAM của tab. */
  active: boolean
}

/**
 * Hỏi lại trước khi rời một công cụ đang giữ tệp: tệp chỉ nằm trong RAM của
 * tab, gỡ màn là mất sạch và không có đường khôi phục.
 *
 * Hai lớp vì hai kiểu rời khác nhau: điều hướng trong app (link, sidebar, nút
 * Back) đi qua router nên chặn bằng `useBlocker` và hỏi bằng hộp thoại của app;
 * đóng tab / F5 / gõ URL khác thì chỉ trình duyệt hỏi được (`beforeunload`).
 */
export function ToolLeaveGuard({ active }: ToolLeaveGuardProps) {
  const { base, kind } = useToolsBranch()
  const { t } = useTranslation('common')

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!active) return false
    // Hết phiên ở nhánh trong app: `RequireAuth` gỡ trang ngay sau đó, "Ở lại" chỉ còn một màn trống.
    if (kind === 'app' && useAuthStore.getState().status === 'unauthenticated') return false
    return leavesToolScreen(base, currentLocation.pathname, nextLocation.pathname)
  })

  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])

  const blocked = blocker.state === 'blocked'

  return (
    <Modal show={blocked} onHide={() => blocker.reset?.()} centered aria-labelledby="erp-tool-leave-title">
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="fs-5" id="erp-tool-leave-title">
          <Icon name="exclamation-triangle" className="me-2" />
          {t('leave.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{t('leave.body')}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" autoFocus onClick={() => blocker.reset?.()}>
          {t('leave.stay')}
        </Button>
        <Button variant="danger" onClick={() => blocker.proceed?.()}>
          {t('leave.leave')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
