import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { FormPreview } from '../components/FormPreview'
import { FORM_TEMPLATES, type FormKind } from '../config/form-templates'

const initial = (kind: FormKind) => Object.fromEntries(FORM_TEMPLATES[kind].fields.map((field) => [field.key, field.initial || '']))

export default function FormTemplatesPage() {
  const id = useId()
  const [kind, setKind] = useState<FormKind>('leave')
  const [values, setValues] = useState<Record<string, string>>(() => initial('leave'))
  const template = FORM_TEMPLATES[kind]
  const changeKind = (next: FormKind) => { setKind(next); setValues(initial(next)) }
  return <>
    <style>{`.cn-form-layout { display: grid; grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr); gap: 24px; align-items: start; } .cn-form-preview { min-width: 0; box-shadow: 0 2px 20px rgba(0,0,0,.06); } @media (max-width: 900px) { .cn-form-layout { grid-template-columns: 1fr; } } @media print { body * { visibility: hidden !important; } .cn-form-print, .cn-form-print * { visibility: visible !important; } .cn-form-print { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm !important; box-shadow: none !important; } @page { size: A4; margin: 0; } }`}</style>
    <ToolBoard>
      <div className="cn-form-layout">
      <ToolPanel title="Soạn mẫu giấy tờ">
        <label className="erp-flow-field__label" htmlFor={`${id}-kind`}>Loại giấy tờ<Form.Select id={`${id}-kind`} value={kind} onChange={(event) => changeKind(event.target.value as FormKind)}>{(Object.entries(FORM_TEMPLATES) as [FormKind, typeof template][]).map(([key, form]) => <option value={key} key={key}>{form.name}</option>)}</Form.Select></label>
        {template.fields.map((field) => <label className="erp-flow-field__label mt-3" key={field.key}>{field.label}{field.multiline
          ? <Form.Control as="textarea" rows={3} maxLength={5000} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
          : <Form.Control maxLength={200} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}
        <Button className="mt-3" onClick={() => window.print()}>In / Lưu PDF</Button>
      </ToolPanel>
      <div><div className="cn-form-preview"><FormPreview kind={kind} values={values} /></div><p className="mt-3">{template.warning || 'Mẫu tham khảo; hãy kiểm tra yêu cầu của nơi tiếp nhận trước khi nộp.'} Dữ liệu chỉ nằm trong trang đang mở.</p></div>
      </div>
    </ToolBoard>
  </>
}
