import {CV_TEMPLATES} from '@/features/tools/documents/config/cv-templates'
import {FORM_TEMPLATES} from '@/features/tools/documents/config/form-templates'
import {SHOP_LAYOUTS,DESIGN_TEMPLATES} from '@/features/tools/design/config/graphic-templates'

export const WORKSPACE_REGISTRY = {
  cv: {version:1,owner:'free',engine:'document',templates:CV_TEMPLATES.map(item=>({id:item.id,version:1})),input:'cv-v1',exports:['pdf','docx'],storage:'opt-in-device'},
  'form-templates': {version:1,owner:'free',engine:'document',templates:Object.keys(FORM_TEMPLATES).map(id=>({id,version:1})),input:'form-v1',exports:['pdf','docx'],storage:'memory'},
  'id-photo': {version:1,owner:'free',engine:'image',templates:[{id:'single',version:1},{id:'mixed',version:1}],input:'portrait-sheet-v1',exports:['pdf','jpg','zip'],storage:'memory'},
  collage: {version:1,owner:'free',engine:'image',templates:SHOP_LAYOUTS.map(item=>({id:item.id,version:1})),input:'graphic-job-v1',exports:['png','jpg','pdf','zip'],storage:'opt-in-brand'},
  'quick-design': {version:1,owner:'free',engine:'image',templates:DESIGN_TEMPLATES.map(item=>({id:item.id,version:1})),input:'graphic-job-v1',exports:['png','jpg','pdf','zip'],storage:'opt-in-brand'},
  'qr-create': {version:1,owner:'free',engine:'code',templates:[{id:'static',version:1},{id:'dynamic',version:1},{id:'labels',version:1}],input:'code-v1',exports:['png','svg','pdf'],storage:'dynamic-consent-and-opt-in-key'},
} as const
export const WORKSPACE_LIFECYCLE = ['input','review','running','result','error','cancelled'] as const
export type WorkspaceId=keyof typeof WORKSPACE_REGISTRY

export const WORKSPACE_FAMILIES = [
  {id:'pdf-documents',owner:'free',version:1,adapter:'FlowTask/FlowResult',input:'PDF/image bytes',storage:'memory'},
  {id:'images',owner:'free',version:1,adapter:'ImageItem/FlowTask',input:'ImageItem[]',storage:'memory'},
  {id:'id-photo',owner:'free',version:1,adapter:'portrait-sheet-v1',input:'photos/crops/mm/copies',storage:'memory'},
  {id:'quick-design',owner:'free',version:1,adapter:'graphic-job-v1',input:'images/brand/physical template',storage:'opt-in-brand'},
  {id:'cv',owner:'free',version:1,adapter:'PrintDocument',input:'CvDraft/optional photo',storage:'opt-in-device'},
  {id:'forms',owner:'free',version:1,adapter:'PrintDocument',input:'form fields',storage:'memory'},
  {id:'construction-free',owner:'free',version:1,adapter:'existing local calculators',input:'user quantities/orientation',storage:'existing opt-in'},
  {id:'qr-barcode',owner:'free',version:1,adapter:'code-v1/FlowTask',input:'payload/label geometry',storage:'dynamic-consent-and-opt-in-key'},
  {id:'family-calendar',owner:'family-calendar',version:1,adapter:'existing calendar product',input:'calendar events',storage:'existing product keys'},
] as const
