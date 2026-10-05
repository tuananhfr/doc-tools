export type FormKind = 'leave' | 'authorization' | 'handover'
export interface FormField { key: string; label: string; initial?: string; multiline?: boolean }
export interface FormTemplate { name: string; fields: FormField[]; warning?: string }

export const FORM_TEMPLATES: Record<FormKind, FormTemplate> = {
  leave: {
    name: 'Đơn xin nghỉ phép', fields: [
      { key: 'recipient', label: 'Kính gửi', initial: 'Ban Giám đốc' }, { key: 'name', label: 'Họ và tên' }, { key: 'department', label: 'Chức vụ, bộ phận' },
      { key: 'from', label: 'Nghỉ từ ngày' }, { key: 'to', label: 'Đến hết ngày' }, { key: 'reason', label: 'Lý do', multiline: true },
      { key: 'handover', label: 'Người nhận bàn giao' }, { key: 'place', label: 'Nơi viết' },
    ],
  },
  authorization: {
    name: 'Giấy ủy quyền', fields: [
      { key: 'fromName', label: 'Người ủy quyền' }, { key: 'fromId', label: 'Số định danh người ủy quyền' }, { key: 'fromAddress', label: 'Địa chỉ người ủy quyền' },
      { key: 'toName', label: 'Người được ủy quyền' }, { key: 'toId', label: 'Số định danh người được ủy quyền' }, { key: 'toAddress', label: 'Địa chỉ người được ủy quyền' },
      { key: 'scope', label: 'Nội dung ủy quyền', multiline: true }, { key: 'term', label: 'Thời hạn' }, { key: 'place', label: 'Nơi viết' },
    ],
    warning: 'Một số việc yêu cầu công chứng hoặc chứng thực. Kiểm tra với nơi tiếp nhận trước khi sử dụng.',
  },
  handover: {
    name: 'Biên bản bàn giao', fields: [
      { key: 'giver', label: 'Bên giao (họ tên, chức vụ)' }, { key: 'receiver', label: 'Bên nhận (họ tên, chức vụ)' },
      { key: 'items', label: 'Danh mục bàn giao (mỗi dòng một mục)', multiline: true }, { key: 'note', label: 'Ghi chú', multiline: true }, { key: 'place', label: 'Nơi lập' },
    ],
  },
}
