export type FormKind = 'leave' | 'authorization' | 'handover' | 'receipt' | 'agreement' | 'employment'
export type FormFieldLabel =
  | 'recipient' | 'name' | 'department' | 'from' | 'to' | 'reason' | 'handover' | 'placeWritten'
  | 'fromName' | 'fromId' | 'fromAddress' | 'toName' | 'toId' | 'toAddress' | 'scope' | 'term'
  | 'giver' | 'receiver' | 'items' | 'note' | 'placeDrawn'
  | 'sender' | 'amount' | 'receivedDate' | 'purpose'
  | 'partyA' | 'partyB' | 'subject' | 'terms' | 'effectiveDate' | 'company' | 'representative' | 'employee' | 'employeeDetails' | 'work' | 'workplace' | 'duration' | 'salary' | 'paySchedule' | 'salaryReview' | 'hours' | 'safety' | 'insurance' | 'training' | 'additionalTerms'
/** `label` là khoá `documents:formTemplates.fields.*`; `initial` là khoá `formTemplates.print.initial.*` — in vào giấy tờ nên theo ngôn ngữ trang. */
export interface FormField { key: string; label: FormFieldLabel; initial?: 'board'; multiline?: boolean }
export interface FormTemplate { fields: FormField[] }

export const FORM_TEMPLATES: Record<FormKind, FormTemplate> = {
  agreement: { fields: [ { key: 'partyA', label: 'partyA', multiline: true }, { key: 'partyB', label: 'partyB', multiline: true }, { key: 'subject', label: 'subject' }, { key: 'terms', label: 'terms', multiline: true }, { key: 'effectiveDate', label: 'effectiveDate' }, { key: 'place', label: 'placeDrawn' } ] },
  employment: { fields: [ { key: 'company', label: 'company', multiline: true }, { key: 'representative', label: 'representative' }, { key: 'employee', label: 'employee' }, { key: 'employeeDetails', label: 'employeeDetails', multiline: true }, { key: 'work', label: 'work' }, { key: 'workplace', label: 'workplace' }, { key: 'duration', label: 'duration' }, { key: 'salary', label: 'salary' }, { key: 'paySchedule', label: 'paySchedule', multiline: true }, { key: 'salaryReview', label: 'salaryReview' }, { key: 'hours', label: 'hours', multiline: true }, { key: 'safety', label: 'safety' }, { key: 'insurance', label: 'insurance', multiline: true }, { key: 'training', label: 'training' }, { key: 'additionalTerms', label: 'additionalTerms', multiline: true }, { key: 'place', label: 'placeDrawn' } ] },
  receipt: {
    fields: [
      { key: 'sender', label: 'sender' }, { key: 'receiver', label: 'receiver' },
      { key: 'amount', label: 'amount' }, { key: 'date', label: 'receivedDate' },
      { key: 'purpose', label: 'purpose', multiline: true }, { key: 'place', label: 'placeDrawn' },
    ],
  },
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
