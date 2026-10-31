export type OcrDocumentFont = 'sans' | 'serif'
export interface OcrTextStyle {
  font: OcrDocumentFont
  fontSize: number
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  lineHeight: number
}
export interface OcrDocumentText extends OcrTextStyle {
  id: string
  kind: 'text'
  x: number
  y: number
  width: number
  height: number
  text: string
  indent?: number
  referenceLines?: { text: string; width: number }[]
}
export interface OcrDocumentCell extends OcrTextStyle {
  id: string
  row: number
  column: number
  rowSpan: number
  columnSpan: number
  text: string
}
export interface OcrDocumentTable {
  id: string
  kind: 'table'
  x: number
  y: number
  width: number
  height: number
  columns: number[]
  rows: number[]
  cells: OcrDocumentCell[]
}
export type OcrDocumentBlock = OcrDocumentText | OcrDocumentTable
export interface OcrDocumentPage { id: string; width: number; height: number; margin?: number; blocks: OcrDocumentBlock[] }
export interface OcrEditableDocument { version: 1; pages: OcrDocumentPage[] }
