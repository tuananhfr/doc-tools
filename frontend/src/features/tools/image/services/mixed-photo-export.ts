import { translate } from '@/i18n/runtime'
import type { FlowTask } from '@/features/tools/hub/types/flow.types'
import type { Rect, Size } from '../types/image.types'
import type { MixedSheetLayout } from '../utils/mixed-photo-layout'
import { mmToPt, mmToPx } from '../utils/photo-layout'
import { portraitIsOriginal, styledPortrait, type PortraitAppearance } from './portrait-appearance'
import { fullRect } from '../utils/crop-rect'
import { renderSinglePhoto } from './photo-sheet'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'
import { setJpegDensity } from '../utils/jpeg-density'

export interface MixedPhotoSource { id: string; source: Blob; rect: Rect; photo: Size; appearance?: PortraitAppearance }

export function mixedPhotoTask(sources: MixedPhotoSource[], layout: MixedSheetLayout, format: 'pdf' | 'jpg', guides: boolean): FlowTask {
  return async step => {
    const rendered = new Map<string, Blob>()
    for (const [index, source] of sources.entries()) {
      step.signal.throwIfAborted();let blob: Blob;if (source.appearance && !portraitIsOriginal(source.appearance)) { const edited = await styledPortrait(source.source, source.rect, source.photo, source.appearance); blob = (await renderSinglePhoto(edited.blob, fullRect(edited.size), source.photo)).blob } else blob = (await renderSinglePhoto(source.source, source.rect, source.photo)).blob;rendered.set(source.id,blob);step.onProgress(index+1,sources.length+layout.pages.length)
    }
    const title=translate('image:mixedPhoto.outputTitle')
    let blob: Blob,extension: string
    if(format==='pdf'){
      const {PDFDocument,rgb}=await import('pdf-lib'),pdf=await PDFDocument.create();pdf.setTitle(title)
      const images=new Map<string,Awaited<ReturnType<typeof pdf.embedJpg>>>()
      for(const[id,image]of rendered)images.set(id,await pdf.embedJpg(await image.arrayBuffer()))
      for(const[index,placements]of layout.pages.entries()){
        step.signal.throwIfAborted();const page=pdf.addPage([mmToPt(layout.paper.width),mmToPt(layout.paper.height)])
        for(const cell of placements){const x=mmToPt(cell.x),y=mmToPt(layout.paper.height-cell.y-cell.height),width=mmToPt(cell.width),height=mmToPt(cell.height);page.drawImage(images.get(cell.id)!,{x,y,width,height});if(guides)page.drawRectangle({x,y,width,height,borderWidth:.25,borderColor:rgb(.6,.6,.6)})}
        step.onProgress(sources.length+index+1,sources.length+layout.pages.length)
      }
      blob=new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'});extension='pdf'
    }else{
      const sheets:Record<string,Uint8Array>={}
      for(const[index,placements]of layout.pages.entries()){
        step.signal.throwIfAborted();const size={width:mmToPx(layout.paper.width,300),height:mmToPx(layout.paper.height,300)},frame=createCanvas(size)
        try{frame.context.fillStyle='#fff';frame.context.fillRect(0,0,size.width,size.height);for(const cell of placements){const image=await decodeImage(rendered.get(cell.id)!);try{const x=mmToPx(cell.x,300),y=mmToPx(cell.y,300),width=mmToPx(cell.width,300),height=mmToPx(cell.height,300);frame.context.drawImage(image,x,y,width,height);if(guides){frame.context.strokeStyle='#999';frame.context.strokeRect(x,y,width,height)}}finally{image.close()}}const image=await encodeCanvas(frame.canvas,'jpeg',.95),bytes=new Uint8Array(await image.arrayBuffer());setJpegDensity(bytes,300);sheets[String(index+1).padStart(3,'0')+'.jpg']=bytes}finally{releaseCanvas(frame.canvas)}step.onProgress(sources.length+index+1,sources.length+layout.pages.length)
      }
      if(layout.pages.length===1){blob=new Blob([Object.values(sheets)[0] as Uint8Array<ArrayBuffer>],{type:'image/jpeg'});extension='jpg'}else{const{zipSync}=await import('fflate');blob=new Blob([new Uint8Array(zipSync(sheets,{level:0}))],{type:'application/zip'});extension='zip'}
    }
    step.signal.throwIfAborted()
    return{title,output:{name:title+'.'+extension,blob},notes:[{tone:'info',text:translate('image:idPhoto.actualSize')},{tone:'info',text:translate('image:idPhoto.noExif')}]}
  }
}
