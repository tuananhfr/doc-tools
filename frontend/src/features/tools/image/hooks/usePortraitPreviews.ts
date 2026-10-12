import {useEffect,useRef,useState} from 'react'
import type {Rect,Size} from '../types/image.types'
import {portraitIsOriginal,styledPortrait,type PortraitAppearance} from '../services/portrait-appearance'

export interface PortraitPreviewRequest {id:string;source:Blob;rect:Rect;photo:Size;appearance:PortraitAppearance}

export function usePortraitPreviews(requests:PortraitPreviewRequest[]){
  const cache=useRef(new Map<string,{fingerprint:string;url:string}>()),blobIds=useRef(new WeakMap<Blob,number>()),nextBlobId=useRef(0)
  const [previews,setPreviews]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false)
  const blobId=(blob:Blob|undefined)=>{if(!blob)return 0;let id=blobIds.current.get(blob);if(id===undefined){id=++nextBlobId.current;blobIds.current.set(blob,id)}return id}
  const fingerprints=requests.map(request=>JSON.stringify([request.id,blobId(request.source),request.rect,request.photo,{...request.appearance,shirtBlob:blobId(request.appearance.shirtBlob)}]))
  const signature=JSON.stringify(fingerprints)
  useEffect(()=>{
    let stopped=false
    const timer=window.setTimeout(async()=>{
      setBusy(true);setFailed(false)
      try{
        const urls:Record<string,string>={}
        for(const[index,request]of requests.entries()){
          if(portraitIsOriginal(request.appearance))continue
          const prior=cache.current.get(request.id)
          if(prior?.fingerprint===fingerprints[index]){urls[request.id]=prior.url;continue}
          const portrait=await styledPortrait(request.source,request.rect,request.photo,request.appearance,480)
          if(stopped)return
          const url=URL.createObjectURL(portrait.blob);if(prior)URL.revokeObjectURL(prior.url)
          cache.current.set(request.id,{fingerprint:fingerprints[index],url});urls[request.id]=url
        }
        if(stopped)return
        for(const[id,value]of cache.current)if(!urls[id]){URL.revokeObjectURL(value.url);cache.current.delete(id)}
        setPreviews(urls)
      }catch{if(!stopped)setFailed(true)}finally{if(!stopped)setBusy(false)}
    },250)
    return()=>{stopped=true;window.clearTimeout(timer)}
  },[signature])
  useEffect(()=>()=>{for(const value of cache.current.values())URL.revokeObjectURL(value.url);cache.current.clear()},[])
  return{previews,busy,failed}
}
