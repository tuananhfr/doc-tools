export type FormKind = 'leave' | 'authorization' | 'handover'
export type FormFieldLabel =
  | 'recipient' | 'name' | 'department' | 'from' | 'to' | 'reason' | 'handover' | 'placeWritten'
  | 'fromName' | 'fromId' | 'fromAddress' | 'toName' | 'toId' | 'toAddress' | 'scope' | 'term'
  | 'giver' | 'receiver' | 'items' | 'note' | 'placeDrawn'
/** `label` là khoá `documents:formTemplates.fields.*`; `name` + `initial` in vào giấy tờ nên giữ tiếng Việt. */
export interface FormField { key: string; label: FormFieldLabel; initial?: string; multiline?: boolean }
export interface FormTemplate { name: string; fields: FormField[] }

export const FORM_TEMPLATES: Record<FormKind, FormTemplate> = {
  leave: {
    name: 'Đơn xin nghỉ phép', fields: [
      { key: 'recipient', label: 'recipient', initial: 'Ban Giám đốc' }, { key: 'name', label: 'name' }, { key: 'department', label: 'department' },
      { key: 'from', label: 'from' }, { key: 'to', label: 'to' }, { key: 'reason', label: 'reason', multiline: true },
      { key: 'handover', label: 'handover' }, { key: 'place', label: 'placeWritten' },
    ],
  },
  authorization: {
    name: 'Giấy ủy quyền', fields: [
      { key: 'fromName', label: 'fromName' }, { key: 'fromId', label: 'fromId' }, { key: 'fromAddress', label: 'fromAddress' },
      { key: 'toName', label: 'toName' }, { key: 'toId', label: 'toId' }, { key: 'toAddress', label: 'toAddress' },
      { key: 'scope', label: 'scope', multiline: true }, { key: 'term', label: 'term' }, { key: 'place', label: 'placeWritten' },
    ],
  },
  handover: {
    name: 'Biên bản bàn giao', fields: [
      { key: 'giver', label: 'giver' }, { key: 'receiver', label: 'receiver' },
      { key: 'items', label: 'items', multiline: true }, { key: 'note', label: 'note', multiline: true }, { key: 'place', label: 'placeDrawn' },
    ],
  },
}
