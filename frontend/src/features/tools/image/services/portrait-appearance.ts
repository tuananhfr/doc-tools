import {detectImageFormat, IMAGE_HEADER_BYTES, readImageSize} from '@/features/tools/shared'
import {MAX_IMAGE_BYTES,maxImagePixels} from '@/features/tools/hub/config/limits'
import { withBase } from '@/utils/url'
import type { Rect, Size } from '../types/image.types'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'
import { applyPortraitMask, portraitMask } from './portrait-mask'

export interface PortraitAppearance { background: string | null; shirt: 'none' | 'blazer' | 'custom'; shirtBlob?: Blob; scale: number; x: number; y: number; brightness?: number; contrast?: number }
export const ORIGINAL_PORTRAIT: PortraitAppearance = { background: null, shirt: 'none', scale: 140, x: 0, y: 27 }
let blazer: Promise<Blob> | null = null

export function portraitIsOriginal(appearance: PortraitAppearance): boolean { return appearance.background === null && appearance.shirt === 'none' && !appearance.brightness && !appearance.contrast }

async function shirtSource(appearance: PortraitAppearance) {
  if (appearance.shirt === 'custom') {
    if (!appearance.shirtBlob || appearance.shirtBlob.size > MAX_IMAGE_BYTES) throw new Error('SHIRT_REQUIRED')
    const head=new Uint8Array(await appearance.shirtBlob.slice(0,IMAGE_HEADER_BYTES).arrayBuffer()),format=detectImageFormat(head)
    if(format!=='png'&&format!=='webp')throw new Error('SHIRT_FORMAT_INVALID')
    const size=readImageSize(head,format)
    if(size&&size.width*size.height>maxImagePixels())throw new Error('SHIRT_PIXEL_LIMIT')
    return appearance.shirtBlob
  }
  if (!blazer) { blazer = fetch(withBase('/assets/id-photo/blazer-v1.png')).then(response => { if (!response.ok) throw new Error('SHIRT_LOAD'); return response.blob() }); blazer.catch(() => { blazer = null }) }
  return blazer
}

export async function styledPortrait(source: Blob, rect: Rect, photo: Size, appearance: PortraitAppearance, edge = 2400, signal?: AbortSignal): Promise<{blob:Blob;size:Size}> {
  signal?.throwIfAborted()
  if (![appearance.brightness ?? 0, appearance.contrast ?? 0].every(value => Number.isFinite(value) && value >= -30 && value <= 30)) throw new Error('INVALID_PORTRAIT')
  if (![rect.x,rect.y,rect.width,rect.height,photo.width,photo.height,appearance.scale,appearance.x,appearance.y].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || photo.width <= 0 || photo.height <= 0 || appearance.scale < 50 || appearance.scale > 200 || appearance.x < -50 || appearance.x > 50 || appearance.y < -20 || appearance.y > 90) throw new Error('INVALID_PORTRAIT')
  const bitmap = await decodeImage(source)
  const scale = Math.min(1,edge/Math.max(rect.width,rect.height)),width=Math.max(1,Math.round(rect.width*scale)),height=Math.max(1,Math.round(width*photo.height/photo.width))
  const frame=createCanvas({width,height})
  try{
    if (!appearance.background) {
      frame.context.fillStyle = 'white'
      frame.context.fillRect(0, 0, width, height)
    }
    frame.context.filter = `brightness(${1 + (appearance.brightness ?? 0) / 100}) contrast(${1 + (appearance.contrast ?? 0) / 100})`
    frame.context.drawImage(bitmap,rect.x,rect.y,rect.width,rect.height,0,0,width,height)
    frame.context.filter = 'none'
    if (appearance.background) {
      const alpha = await portraitMask(source, bitmap, signal)
      signal?.throwIfAborted()
      if (alpha) applyPortraitMask(frame.context, alpha, bitmap, rect, { width, height })
      frame.context.globalCompositeOperation = 'destination-over'
      frame.context.fillStyle = appearance.background
      frame.context.fillRect(0, 0, width, height)
      frame.context.globalCompositeOperation = 'source-over'
    }
    if(appearance.shirt!=='none'){
      const shirt=await decodeImage(await shirtSource(appearance))
      try{if(shirt.width*shirt.height>maxImagePixels())throw new Error('SHIRT_PIXEL_LIMIT');const drawWidth=width*appearance.scale/100,drawHeight=drawWidth*shirt.height/shirt.width;frame.context.drawImage(shirt,(width-drawWidth)/2+width*appearance.x/100,height*appearance.y/100,drawWidth,drawHeight)}finally{shirt.close()}
    }
    signal?.throwIfAborted()
    return{blob:await encodeCanvas(frame.canvas,'jpeg',.95),size:{width,height}}
  }finally{bitmap.close();releaseCanvas(frame.canvas)}
}
