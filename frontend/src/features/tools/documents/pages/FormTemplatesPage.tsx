import { useDeferredValue, useState } from 'react'
import { Form } from 'react-bootstrap'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { PrintPortal, TemplatePicker, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { FormPreview } from '../components/FormPreview'
import { DocumentExportActions } from '../components/DocumentExportActions'
import { formDocument } from '../services/form-document'
import { FORM_TEMPLATES, type FormKind } from '../config/form-templates'
import { leaveDateProblem } from '../utils/form-dates'
import { receiptProblem, receiptWords } from '../utils/receipt'
import { anyFormEdited, switchFormKind, type FormSwitchState } from '../utils/template-switch'
import { ResponsivePreview } from '@/features/tools/hub/components/board/ResponsivePreview'
import { NumberField, ToolLeaveGuard, type NumberRule } from '@/features/tools/hub'

const RECEIPT_MONEY: NumberRule = { kind: 'money', min: 1, max: 999_999_999_999_999 }
const FORM_KINDS = Object.keys(FORM_TEMPLATES) as FormKind[]

const initial = (kind: FormKind, t: TFunction<'documents'>) =>
  Object.fromEntries(FORM_TEMPLATES[kind].fields.map((field) => [field.key, field.initial ? t(`formTemplates.print.initial.${field.initial}`) : '']))

export default function FormTemplatesPage() {
  const { t } = useTranslation('documents')
  const { t: tc } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.formTemplates' })
  const [form, setForm] = useState<FormSwitchState<FormKind>>(() => ({ kind: 'leave', values: initial('leave', t), drafts: {} }))
  const { kind, values } = form
  const defaultsOf = (next: FormKind) => initial(next, t)
  const setValues = (change: (current: Record<string, string>) => Record<string, string>) => setForm(state => ({ ...state, values: change(state.values) }))
  // Nháp từng loại giữ trong RAM nên đổi loại không mất gì — không hỏi lại mỗi lần bấm thumbnail (spec v3 UI03).
  const changeKind = (next: FormKind) => setForm(state => switchFormKind(state, next, defaultsOf))
  // Sáu thumbnail vẽ lại theo từng phím gõ; để chậm một nhịp sau ô nhập.
  const thumbs = useDeferredValue(form)
  const template = FORM_TEMPLATES[kind]
  const dateProblem = kind === 'leave' ? leaveDateProblem(values.from ?? '', values.to ?? '') : null
  const receiptError = kind === 'receipt' ? receiptProblem(values) : null
  const edited = anyFormEdited(form, defaultsOf)
  const print = <DocumentExportActions disabled={Boolean(dateProblem || receiptError)} build={() => formDocument(kind, values, t)} />
  const picker = <TemplatePicker label={t('formTemplates.kind')} value={kind} onChange={changeKind} items={FORM_KINDS.map(key => ({ id: key, label: t(`formTemplates.names.${key}`), preview: <div className="cn-template-page"><FormPreview kind={key} values={key === thumbs.kind ? thumbs.values : thumbs.drafts[key] ?? defaultsOf(key)} /></div> }))} />
  return <>
    <style>{`.cn-form-layout { display: grid; grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr); gap: 24px; align-items: start; } .cn-form-preview { min-width: 0; box-shadow: 0 2px 20px rgba(0,0,0,.06); } @media (max-width: 900px) { .cn-form-layout { grid-template-columns: 1fr; } } @media print { @page { size: A4; margin: 20mm; } .erp-print-portal .cn-form-print { padding: 0 !important; } }`}</style>
    <ToolBoard className="cn-form-studio" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>}>
      <ResponsivePreview action={<><div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="file-earmark-text" /></span><div><h2>{studio('previewTitle')}</h2><p>{studio('resultHint')}</p></div></div>{print}</>} templates={picker} preview={<><div className="cn-form-preview"><FormPreview kind={kind} values={values} /></div><p className="mt-3">{kind === 'authorization' ? t('formTemplates.authorizationWarning') : t('formTemplates.defaultWarning')} {t('formTemplates.privacy')}</p></>}>
      <ToolPanel title={t('formTemplates.title')} actions={<span className="cn-studio-small-icon"><Icon name="pencil-square" /></span>}>
        <p className="cn-studio-form-hint">{studio('inputHint')}</p>
        <div className="cn-document-fields">
        {template.fields.map((field) => field.key === 'amount' ? <NumberField key={field.key} className="mt-3" label={t('formTemplates.fields.amount')} rule={RECEIPT_MONEY} unit="đ" value={values.amount ?? ''} onChange={amount => setValues(current => ({ ...current, amount }))} /> : <label className="erp-flow-field__label mt-3" key={field.key}>{t(`formTemplates.fields.${field.label}`)}{field.multiline
          ? <Form.Control as="textarea" rows={3} maxLength={5000} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
          : <Form.Control maxLength={200} placeholder={field.key === 'date' || kind === 'leave' && (field.key === 'from' || field.key === 'to') ? t('formTemplates.datePlaceholder') : undefined} isInvalid={(dateProblem === 'from' && field.key === 'from') || ((dateProblem === 'to' || dateProblem === 'order') && field.key === 'to') || receiptError === 'date' && field.key === 'date'} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}
        </div>
        {dateProblem ? <p className="erp-tool-form__error mt-2" role="alert">{t(`formTemplates.dateErrors.${dateProblem}`)}</p> : null}
        {kind === 'receipt' ? <><p className="mt-2">{t('formTemplates.print.receipt.words', { value: receiptWords(values.amount ?? '') ?? '—' })}</p>{receiptError ? <p role="alert">{t(`formTemplates.receiptErrors.${receiptError}`)}</p> : null}</> : null}
        <div className="mt-3">{print}</div>
      </ToolPanel>
      </ResponsivePreview>
    </ToolBoard>
    <PrintPortal><FormPreview kind={kind} values={values} /></PrintPortal>
    <ToolLeaveGuard active={edited} message={tc('workspace.unsaved')} />
  </>
}
