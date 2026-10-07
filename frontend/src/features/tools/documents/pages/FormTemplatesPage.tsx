import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { FormPreview } from '../components/FormPreview'
import { FORM_TEMPLATES, type FormKind } from '../config/form-templates'

const initial = (kind: FormKind) => Object.fromEntries(FORM_TEMPLATES[kind].fields.map((field) => [field.key, field.initial || '']))

export default function FormTemplatesPage() {
  const { t } = useTranslation('documents')
  const id = useId()
  const [kind, setKind] = useState<FormKind>('leave')
  const [values, setValues] = useState<Record<string, string>>(() => initial('leave'))
  const template = FORM_TEMPLATES[kind]
  const changeKind = (next: FormKind) => { setKind(next); setValues(initial(next)) }
  return <>
    <style>{`.cn-form-layout { display: grid; grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr); gap: 24px; align-items: start; } .cn-form-preview { min-width: 0; box-shadow: 0 2px 20px rgba(0,0,0,.06); } @media (max-width: 900px) { .cn-form-layout { grid-template-columns: 1fr; } } @media print { body * { visibility: hidden !important; } .cn-form-print, .cn-form-print * { visibility: visible !important; } .cn-form-print { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm !important; box-shadow: none !important; } @page { size: A4; margin: 0; } }`}</style>
    <ToolBoard>
      <div className="cn-form-layout">
      <ToolPanel title={t('formTemplates.title')}>
        <label className="erp-flow-field__label" htmlFor={`${id}-kind`}>{t('formTemplates.kind')}<Form.Select id={`${id}-kind`} value={kind} onChange={(event) => changeKind(event.target.value as FormKind)}>{(Object.keys(FORM_TEMPLATES) as FormKind[]).map((key) => <option value={key} key={key}>{t(`formTemplates.names.${key}`)}</option>)}</Form.Select></label>
        {template.fields.map((field) => <label className="erp-flow-field__label mt-3" key={field.key}>{t(`formTemplates.fields.${field.label}`)}{field.multiline
          ? <Form.Control as="textarea" rows={3} maxLength={5000} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
          : <Form.Control maxLength={200} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}
        <Button className="mt-3" onClick={() => window.print()}>{t('shared.print')}</Button>
      </ToolPanel>
      <div><div className="cn-form-preview"><FormPreview kind={kind} values={values} /></div><p className="mt-3">{kind === 'authorization' ? t('formTemplates.authorizationWarning') : t('formTemplates.defaultWarning')} {t('formTemplates.privacy')}</p></div>
      </div>
    </ToolBoard>
  </>
}
