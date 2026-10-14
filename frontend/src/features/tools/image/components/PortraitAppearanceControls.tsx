import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import {Form} from 'react-bootstrap'
import {useTranslation} from 'react-i18next'
import type {PortraitAppearance} from '../services/portrait-appearance'

export function PortraitAppearanceControls({value,onChange}:{value:PortraitAppearance;onChange:(patch:Partial<PortraitAppearance>)=>void}){
  const{t}=useTranslation('image')
  return <details className="cn-portrait-options mt-3"><summary>{t('portrait.options')}</summary>
    <label className="erp-flow-field__label mt-3">{t('portrait.background')}<Form.Select aria-label={t('portrait.background')} value={value.background??'original'} onChange={e=>onChange({background:e.target.value==='original'?null:e.target.value})}><option value="original">{t('portrait.keepBackground')}</option><option value="#ffffff">{t('portrait.white')}</option><option value="#65a9e8">{t('portrait.blue')}</option><option value="#d9d9d9">{t('portrait.gray')}</option></Form.Select></label>
    {value.background?<p className="erp-flow-field__hint">{t('portrait.backgroundHint')}</p>:null}
    <label className="erp-flow-field__label mt-3">{t('portrait.shirt')}<Form.Select aria-label={t('portrait.shirt')} value={value.shirt} onChange={e=>onChange({shirt:e.target.value as PortraitAppearance['shirt']})}><option value="none">{t('portrait.keepShirt')}</option><option value="blazer">{t('portrait.blazer')}</option><option value="custom">{t('portrait.customShirt')}</option></Form.Select></label>
    {value.shirt==='custom'?<label className="erp-flow-field__label mt-3">{t('portrait.uploadShirt')}<FileInput accept="image/png,image/webp" onChange={e=>onChange({shirtBlob:(e.target as HTMLInputElement).files?.[0]})}/></label>:null}
    {value.shirt!=='none'?<><p className="erp-flow-field__hint mt-2">{t('portrait.shirtHint')}</p>{(['scale','x','y']as const).map(key=><label key={key} className="erp-flow-field__label mt-3">{t(`portrait.${key}`)}: {value[key]}%<Form.Range aria-label={t(`portrait.${key}`)} value={value[key]} min={key==='scale'?50:key==='x'?-50:-20} max={key==='scale'?200:key==='x'?50:90} onChange={e=>onChange({[key]:Number(e.target.value)})}/></label>)}</>:null}
  </details>
}
