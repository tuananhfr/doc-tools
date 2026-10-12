import type { PrintDocument, DocumentBlock } from '../types/print-document'
import { DOCUMENT_EXPORT_LIMITS, documentCharacterCount } from '../types/print-document'

export async function documentDocx(document: PrintDocument): Promise<Blob> {
  if (documentCharacterCount(document) > DOCUMENT_EXPORT_LIMITS.characters) throw new Error('DOCUMENT_TEXT_LIMIT')
  const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, Footer, PageNumber, BorderStyle } = await import('docx')
  const paragraphs = (blocks: DocumentBlock[]) => blocks.flatMap(block => block.text.split('\n').map(text => new Paragraph({
    alignment: block.align === 'center' || document.layout === 'centered' && ['title', 'subtitle'].includes(block.kind) ? AlignmentType.CENTER : AlignmentType.LEFT,
    keepNext: block.kind === 'heading', spacing: { before: block.kind === 'heading' ? 180 : 0, after: document.layout === 'compact' ? 80 : 130 },
    children: [new TextRun({ text, font: document.font, size: block.kind === 'title' ? 50 : block.kind === 'heading' ? (document.fontSize + 1) * 2 : document.fontSize * 2, bold: ['title', 'heading', 'subtitle'].includes(block.kind), italics: block.kind === 'note', color: block.kind === 'heading' ? document.accent.slice(1) : '202C3A' })],
  })))
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []
  let photoParagraph: InstanceType<typeof Paragraph> | null = null
  if (document.photo) {
    const codec = await import('@/features/tools/image/services/image-codec'), image = await codec.decodeImage(document.photo)
    try {
      const {canvas,context}=codec.createCanvas({width:330,height:425})
      try{const scale=Math.max(330/image.width,425/image.height);context.fillStyle='#fff';context.fillRect(0,0,330,425);context.drawImage(image,(330-image.width*scale)/2,(425-image.height*scale)/2,image.width*scale,image.height*scale);const photo=await codec.encodeCanvas(canvas,'jpeg',.95);photoParagraph=new Paragraph({alignment:AlignmentType.RIGHT,children:[new ImageRun({type:'jpg',data:new Uint8Array(await photo.arrayBuffer()),transformation:{width:105,height:135}})]})}finally{codec.releaseCanvas(canvas)}
    }finally{image.close()}
  }
  const noBorders = Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(side=>[side,{style:BorderStyle.NONE,size:0,color:'FFFFFF'}]))
  if(photoParagraph) children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorders,rows:[new TableRow({children:[new TableCell({width:{size:78,type:WidthType.PERCENTAGE},children:paragraphs(document.blocks.slice(0,2))}),new TableCell({width:{size:22,type:WidthType.PERCENTAGE},children:[photoParagraph]})]})]}))
  else children.push(...paragraphs(document.blocks.slice(0,2)))
  if (document.sidebar?.length) {
    children.push(new Table({borders:noBorders,width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:[new TableCell({width:{size:30,type:WidthType.PERCENTAGE},children:paragraphs(document.sidebar)}),new TableCell({width:{size:70,type:WidthType.PERCENTAGE},children:paragraphs(document.blocks.slice(2))})]})]}))
  } else children.push(...paragraphs(document.blocks.slice(2)))
  const file = new Document({title:document.title,styles:{default:{document:{run:{font:document.font,size:document.fontSize*2}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:880,right:880,bottom:880,left:880}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({children:[PageNumber.CURRENT]})]})]})},children}]})
  return Packer.toBlob(file)
}
