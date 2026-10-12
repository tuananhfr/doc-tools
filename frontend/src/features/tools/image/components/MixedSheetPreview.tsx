import type { MixedSheetLayout } from '../utils/mixed-photo-layout'
import type { ImageItem, Rect } from '../types/image.types'

export function MixedSheetPreview({layout,items,crops,styled={}}:{layout:MixedSheetLayout;items:readonly ImageItem[];crops:Record<string,Rect>;styled?:Record<string,string>}){
  return <div className="cn-mixed-sheet-previews">{layout.pages.map((cells,index)=><div key={index} className="cn-mixed-sheet" style={{aspectRatio:layout.paper.width/layout.paper.height}}>{cells.map((cell,position)=>{const item=items.find(image=>image.id===cell.id),crop=crops[cell.id];if(!item||!crop)return null;return <div key={position} className="cn-mixed-sheet-cell" style={{left:cell.x/layout.paper.width*100+'%',top:cell.y/layout.paper.height*100+'%',width:cell.width/layout.paper.width*100+'%',height:cell.height/layout.paper.height*100+'%'}}><img src={styled[cell.id]??item.url} alt={item.name} style={styled[cell.id]?{width:'100%',height:'100%',left:0,top:0}:{width:item.width/crop.width*100+'%',height:item.height/crop.height*100+'%',left:-crop.x/crop.width*100+'%',top:-crop.y/crop.height*100+'%'}}/></div>})}</div>)}</div>
}
