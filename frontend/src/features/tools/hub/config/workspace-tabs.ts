export type WorkspaceTabGroupId = 'qr' | 'calc' | 'image'

export interface WorkspaceTabGroup {
  id: WorkspaceTabGroupId
  toolIds: readonly string[]
}

/**
 * Công cụ cùng nhóm việc dùng chung một thanh tab (spec v3 §02: "Tạo/Quét là 2 hành động", Calculator
 * Shell, Image Workspace). Tab là LINK giữa slug, không gộp màn: deep link, tìm kiếm và nút Quay lại giữ
 * nguyên. Mỗi công cụ thuộc tối đa MỘT nhóm; nhãn của thanh ở `catalog:workspaceTabs.<id>`.
 */
export const WORKSPACE_TAB_GROUPS: readonly WorkspaceTabGroup[] = [
  { id: 'qr', toolIds: ['qr-create', 'barcode-create', 'qr-read', 'vietqr'] },
  { id: 'calc', toolIds: ['money-calc', 'quick-calc', 'unit-convert', 'date-calc'] },
  { id: 'image', toolIds: ['crop-image', 'compress-image', 'convert-image', 'batch-image', 'collage', 'mark-image', 'remove-background'] },
]
