import type { TFunction } from 'i18next'
import type { FormKind } from '../config/form-templates'
import { FORM_TEMPLATES } from '../config/form-templates'
import type { DocumentBlock, PrintDocument } from '../types/print-document'
import { parseFormDate } from '../utils/form-dates'
import { receiptAmount, receiptWords } from '../utils/receipt'
import { formatNumber } from '@/utils/format'

export function formDocument(kind: FormKind, values: Record<string, string>, t: TFunction<'documents'>): PrintDocument {
  const v = (key: string) => values[key]?.trim() || '…………'
  const title = t(`formTemplates.names.${kind}`)
  const date = parseFormDate(values.date ?? '') ?? new Date()
  const blocks: DocumentBlock[] = [
    { kind: 'subtitle', text: t('formTemplates.print.nation'), align: 'center' },
    { kind: 'paragraph', text: t('formTemplates.print.motto'), align: 'center' },
    { kind: 'note', text: t('formTemplates.print.dateLine', { place: v('place'), day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() }) },
    { kind: 'title', text: title, align: 'center' },
  ]
  const paragraph = (text: string) => blocks.push({kind:'paragraph',text})
  if (kind === 'leave') {
    paragraph(t('formTemplates.print.leave.recipient',{value:v('recipient')}));paragraph(t('formTemplates.print.leave.name')+' '+v('name'));paragraph(t('formTemplates.print.leave.department',{value:v('department')}));paragraph(t('formTemplates.print.leave.period',{from:v('from'),to:v('to')}));paragraph(t('formTemplates.print.leave.reason',{value:v('reason')}));paragraph(t('formTemplates.print.leave.handover',{value:v('handover')}));paragraph(t('formTemplates.print.leave.closing'))
  } else if(kind==='authorization') {
    paragraph(t('formTemplates.print.authorization.principal')+' '+v('fromName'));paragraph(t('formTemplates.print.authorization.personalId',{value:v('fromId')}));paragraph(t('formTemplates.print.authorization.address',{value:v('fromAddress')}));paragraph(t('formTemplates.print.authorization.attorney')+' '+v('toName'));paragraph(t('formTemplates.print.authorization.personalId',{value:v('toId')}));paragraph(t('formTemplates.print.authorization.address',{value:v('toAddress')}));paragraph(t('formTemplates.print.authorization.scope')+' '+v('scope'));paragraph(t('formTemplates.print.authorization.term')+' '+v('term'));paragraph(t('formTemplates.print.authorization.commitment'))
  } else if(kind==='receipt') {
    paragraph(t('formTemplates.print.receipt.sender',{value:v('sender')}));paragraph(t('formTemplates.print.receipt.receiver',{value:v('receiver')}));const amount=receiptAmount(values.amount??'');paragraph(t('formTemplates.print.receipt.amount',{value:amount===null?'…………':formatNumber(amount)}));paragraph(t('formTemplates.print.receipt.words',{value:receiptWords(values.amount??'')??'…………'}));paragraph(t('formTemplates.print.receipt.purpose',{value:v('purpose')}));paragraph(t('formTemplates.print.receipt.confirmation'))
  } else if(kind==='handover') {
    paragraph(t('formTemplates.print.handover.intro'));paragraph(t('formTemplates.print.handover.giver')+' '+v('giver'));paragraph(t('formTemplates.print.handover.receiver')+' '+v('receiver'));paragraph(t('formTemplates.print.handover.itemsIntro'));for(const [index,item]of v('items').split('\n').entries())paragraph(`${index+1}. ${item}`);paragraph(t('formTemplates.print.handover.note',{value:v('note')}));paragraph(t('formTemplates.print.handover.copies'))
  } else {
    for(const field of FORM_TEMPLATES[kind].fields) if(field.key!=='place')paragraph(t(`formTemplates.fields.${field.label}`)+': '+v(field.key))
  }
  const signatures = kind==='leave'?['approver','applicant'] as const:kind==='authorization'?['attorney','principal'] as const:kind==='handover'?['receiver','giver'] as const:kind==='receipt'?['receiver','sender'] as const:kind==='employment'?['employer','employee'] as const:['partyA','partyB'] as const
  blocks.push({kind:'heading',text:signatures.map(signature=>t(`formTemplates.print.signatures.${signature}`)).join('                         ')},{kind:'note',text:t('formTemplates.print.signHint')},{kind:'note',text:kind==='authorization'?t('formTemplates.authorizationWarning'):t('formTemplates.defaultWarning')})
  return {title,name:title,font:'Georgia',fontSize:11,accent:'#334155',layout:'standard',blocks}
}
