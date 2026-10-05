import type { ReactNode } from 'react'
import { Tab, Tabs } from 'react-bootstrap'
import { SIDE_PANEL_ID } from '../utils/export-sections'

export type SideTab = 'export' | 'decorate' | 'search' | 'form'

interface DocSidePanelProps {
  exportPanel: ReactNode
  decorationPanel: ReactNode
  searchPanel: ReactNode
  /** Chỉ có khi tài liệu có tệp mang form. */
  formPanel: ReactNode | null
  /** Thay đổi form chưa áp dụng — tải về lúc này là thiếu chúng. */
  formPending: number
  /** Số trang trí đang bật — hiện trên nhãn tab để khỏi quên là tệp xuất sẽ có dấu. */
  decorationCount: number
  activeTab: SideTab
  onTabChange: (tab: SideTab) => void
}

function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <>
      <span className="erp-doc-export__badge" aria-hidden>
        {count}
      </span>
      <span className="visually-hidden">
        {' '}
        ({count} {label})
      </span>
    </>
  )
}

/**
 * Cột phải: Xuất tệp | Số trang & dấu | Tìm | Điền form (khi có). Các tab cùng gắn sẵn để giữ những
 * gì đã nhập khi chuyển qua lại. Tab do trang điều khiển để Ctrl+F nhảy thẳng tới Tìm.
 */
export function DocSidePanel({ exportPanel, decorationPanel, searchPanel, formPanel, formPending, decorationCount, activeTab, onTabChange }: DocSidePanelProps) {
  return (
    <aside id={SIDE_PANEL_ID} className="erp-doc-export" aria-label="Xuất tệp, trang trí trang, tìm chữ và điền form">
      <Tabs
        activeKey={activeTab}
        onSelect={(key) => key && onTabChange(key as SideTab)}
        id="doc-tools-side"
        className="erp-doc-export__tabs"
        fill
      >
        <Tab eventKey="export" title="Xuất tệp">
          {exportPanel}
        </Tab>
        <Tab
          eventKey="decorate"
          title={
            <>
              Số trang & dấu
              <Badge count={decorationCount} label="đang bật" />
            </>
          }
        >
          {decorationPanel}
        </Tab>
        <Tab eventKey="search" title="Tìm">
          {searchPanel}
        </Tab>
        {formPanel ? (
          <Tab
            eventKey="form"
            title={
              <>
                Điền form
                <Badge count={formPending} label="thay đổi chưa áp dụng" />
              </>
            }
          >
            {formPanel}
          </Tab>
        ) : null}
      </Tabs>
    </aside>
  )
}
