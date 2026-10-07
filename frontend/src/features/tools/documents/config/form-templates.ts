export type FormKind = 'leave' | 'authorization' | 'handover'
export type FormFieldLabel =
  | 'recipient' | 'name' | 'department' | 'from' | 'to' | 'reason' | 'handover' | 'placeWritten'
  | 'fromName' | 'fromId' | 'fromAddress' | 'toName' | 'toId' | 'toAddress' | 'scope' | 'term'
  | 'giver' | 'receiver' | 'items' | 'note' | 'placeDrawn'
/** `label` là khoá `documents:formTemplates.fields.*`; `initial` là khoá `formTemplates.print.initial.*` — in vào giấy tờ nên theo ngôn ngữ trang. */
export interface FormField { key: string; label: FormFieldLabel; initial?: 'board'; multiline?: boolean }
export interface FormTemplate { fields: FormField[] }

export const FORM_TEMPLATES: Record<FormKind, FormTemplate> = {
  leave: {
    fields: [
      { key: 'recipient', label: 'recipient', initial: 'board' }, { key: 'name', label: 'name' }, { key: 'department', label: 'department' },
      { key: 'from', label: 'from' }, { key: 'to', label: 'to' }, { key: 'reason', label: 'reason', multiline: true },
      { key: 'handover', label: 'handover' }, { key: 'place', label: 'placeWritten' },
    ],
  },
  authorization: {
    fields: [
      { key: 'fromName', label: 'fromName' }, { key: 'fromId', label: 'fromId' }, { key: 'fromAddress', label: 'fromAddress' },
      { key: 'toName', label: 'toName' }, { key: 'toId', label: 'toId' }, { key: 'toAddress', label: 'toAddress' },
      { key: 'scope', label: 'scope', multiline: true }, { key: 'term', label: 'term' }, { key: 'place', label: 'placeWritten' },
    ],
  },
  handover: {
    fields: [
      { key: 'giver', label: 'giver' }, { key: 'receiver', label: 'receiver' },
      { key: 'items', label: 'items', multiline: true }, { key: 'note', label: 'note', multiline: true }, { key: 'place', label: 'placeDrawn' },
    ],
  },
}
