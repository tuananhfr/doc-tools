import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolFlow } from '@/features/tools/hub/components/flow/ToolFlow'
import { useFlowRun } from '@/features/tools/hub/hooks/useFlowRun'
import { parseDecimal } from '@/features/tools/hub'
import { useImageFiles } from '../hooks/useImageFiles'
import { PAPER_SIZES, PHOTO_SIZES } from '../config/photo-presets'
import { mixedPhotoLayout } from '../utils/mixed-photo-layout'
import { rectForAspect } from '../utils/crop-rect'
import { initialCrop } from '../utils/crop-state'
import type { Rect } from '../types/image.types'
import { mixedPhotoTask } from '../services/mixed-photo-export'
import { CropStage } from '../components/CropStage'
import { MixedSheetPreview } from '../components/MixedSheetPreview'
import { CameraCapture } from '../components/CameraCapture'
import { PortraitAppearanceControls } from '../components/PortraitAppearanceControls'
import { ORIGINAL_PORTRAIT, type PortraitAppearance } from '../services/portrait-appearance'
import { usePortraitPreviews } from '../hooks/usePortraitPreviews'

interface Choice { sizeId: string; copies: string; width: string; height: string; rect?: Rect; appearance?: PortraitAppearance }
const defaultChoice: Choice = { sizeId:'3x4',copies:'2',width:'30',height:'40' }

export default function MixedPhotoPage({initialFiles,onBack,visible}:{initialFiles:File[];onBack:()=>void;visible:boolean}){
  const {t}=useTranslation('image'),images=useImageFiles({multiple:true}),run=useFlowRun(),seeded=useRef(false)
  const[choices,setChoices]=useState<Record<string,Choice>>({}),[activeId,setActiveId]=useState<string|null>(null),[paperId,setPaperId]=useState('a4'),[format,setFormat]=useState<'pdf'|'jpg'>('pdf'),[guides,setGuides]=useState(true),[camera,setCamera]=useState(false)
  useEffect(()=>{if(visible&&!seeded.current){seeded.current=true;if(initialFiles.length)void images.addFiles(initialFiles)}},[images.addFiles,initialFiles,visible])
  const active=images.items.find(item=>item.id===activeId)??images.items[0]??null
  const choice=(id:string)=>choices[id]??defaultChoice
  const photo=(id:string)=>{const option=choice(id);return option.sizeId==='custom'?{width:parseDecimal(option.width)??0,height:parseDecimal(option.height)??0}:PHOTO_SIZES.find(size=>size.id===option.sizeId)??PHOTO_SIZES[1]}
  const crops=Object.fromEntries(images.items.map(item=>[item.id,choice(item.id).rect??rectForAspect(item,photo(item.id).width/Math.max(photo(item.id).height,1))]))
  const portrait = usePortraitPreviews(images.items.map(item => ({ id: item.id, source: item.file, rect: crops[item.id], photo: photo(item.id), appearance: choice(item.id).appearance ?? ORIGINAL_PORTRAIT })))
  const paper=PAPER_SIZES.find(size=>size.id===paperId)??PAPER_SIZES[0]
  let layout:null|ReturnType<typeof mixedPhotoLayout>=null,error=''
  if(images.items.length)try{layout=mixedPhotoLayout(paper,images.items.map(item=>({id:item.id,photo:photo(item.id),copies:parseDecimal(choice(item.id).copies)??0})))}catch{error=t('mixedPhoto.invalid')}
  const change=(patch:Partial<Choice>)=>{if(active)setChoices(current=>({...current,[active.id]:{...(current[active.id]??defaultChoice),...patch}}))}
  if(!visible)return null
  return <>
    <div className="cn-mixed-photo-toolbar"><Button variant="outline-secondary" onClick={onBack} disabled={run.state.phase==='running'}>{t('mixedPhoto.backSingle')}</Button><p>{t('mixedPhoto.explain')}</p></div>
    <ToolFlow mobilePreview picker={{accept:'.jpg,.jpeg,.png,.webp',multiple:true,title:t('mixedPhoto.choose'),hint:t('shell.hint')}} files={images.items.map(item=>({id:item.id,name:item.name,size:item.size,icon:'file-earmark-image',thumbnail:item.thumbnail??undefined}))} loading={images.loading} rejected={images.rejected} onDismissRejected={images.dismissRejected} onAddFiles={files=>void images.addFiles(files)} onRemove={images.remove} onClear={images.clear} pickerExtra={<Button variant="outline-secondary" onClick={()=>setCamera(true)}>{t('mixedPhoto.camera')}</Button>}
      stage={active&&layout?<div><CropStage item={active} state={{...initialCrop(active),rect:crops[active.id]}} aspect={photo(active.id).width/photo(active.id).height} disabled={run.state.phase==='running'} onRectChange={rect=>change({rect})}/><MixedSheetPreview layout={layout} items={images.items} crops={crops} styled={portrait.previews}/></div>:undefined}
      options={images.items.length?<>
        <label className="erp-flow-field__label">{t('mixedPhoto.active')}<Form.Select aria-label={t('mixedPhoto.active')} value={active?.id??''} onChange={e=>setActiveId(e.target.value)}>{images.items.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</Form.Select></label>
        {active?<><label className="erp-flow-field__label mt-3">{t('idPhoto.photoSize')}<Form.Select aria-label={t('idPhoto.photoSize')} value={choice(active.id).sizeId} onChange={e=>change({sizeId:e.target.value,rect:undefined})}>{PHOTO_SIZES.map(size=><option key={size.id} value={size.id}>{size.label}</option>)}<option value="custom">{t('mixedPhoto.custom')}</option></Form.Select></label>{choice(active.id).sizeId==='custom'?<div className="erp-flow-pair mt-3"><label>{t('mixedPhoto.width')}<Form.Control aria-label={t('mixedPhoto.width')} value={choice(active.id).width} inputMode="decimal" onChange={e=>change({width:e.target.value,rect:undefined})}/></label><label>{t('mixedPhoto.height')}<Form.Control aria-label={t('mixedPhoto.height')} value={choice(active.id).height} inputMode="decimal" onChange={e=>change({height:e.target.value,rect:undefined})}/></label></div>:null}<label className="erp-flow-field__label mt-3">{t('idPhoto.copies')}<Form.Control aria-label={t('idPhoto.copies')} value={choice(active.id).copies} inputMode="numeric" onChange={e=>change({copies:e.target.value})}/></label></>:null}
        {active ? <PortraitAppearanceControls value={choice(active.id).appearance ?? ORIGINAL_PORTRAIT} onChange={patch => change({ appearance: { ...(choice(active.id).appearance ?? ORIGINAL_PORTRAIT), ...patch } })} /> : null}
        <label className="erp-flow-field__label mt-3">{t('idPhoto.paperLabel')}<Form.Select aria-label={t('idPhoto.paperLabel')} value={paperId} onChange={e=>setPaperId(e.target.value)}>{PAPER_SIZES.map(size=><option key={size.id} value={size.id}>{t(`idPhoto.paper.${size.id}`)}</option>)}</Form.Select></label>
        <label className="erp-flow-field__label mt-3">{t('mixedPhoto.format')}<Form.Select aria-label={t('mixedPhoto.format')} value={format} onChange={e=>setFormat(e.target.value as 'pdf'|'jpg')}><option value="pdf">PDF</option><option value="jpg">JPG 300 DPI / ZIP</option></Form.Select></label>
        <Form.Check id="cn-mixed-guides" className="mt-3" checked={guides} label={t('idPhoto.guides')} onChange={e=>setGuides(e.target.checked)}/>
        {layout?<p className="erp-flow-field__hint mt-3">{t('mixedPhoto.summary',{photos:layout.pages.flat().length,sheets:layout.pages.length})}</p>:null}
      </>:undefined} runLabel={t('mixedPhoto.run')} runIcon="person-badge" blocked={images.items.length?(portrait.failed ? t('portrait.failed') : error||null):t('shell.noImages')} run={run} onRun={()=>{if(layout)void run.start(mixedPhotoTask(images.items.map(item=>({id:item.id,source:item.file,rect:crops[item.id],photo:photo(item.id),appearance:choice(item.id).appearance})),layout,format,guides))}}/>
    {camera?<CameraCapture show onClose={()=>setCamera(false)} onDone={files=>{setCamera(false);void images.addFiles(files)}}/>:null}
  </>
}
