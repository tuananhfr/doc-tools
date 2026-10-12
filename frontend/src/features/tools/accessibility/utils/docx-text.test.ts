import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { docxToText, wordXmlToText } from './docx-text'

describe('wordXmlToText', () => {
  it('keeps document order, tabs, breaks and entities, and skips the Fallback copy of text boxes', () => {
    const xml = '<?xml version="1.0"?><w:document><w:body>'
      + '<w:p><w:r><w:t>Cột</w:t><w:tab/><w:t xml:space="preserve">A &amp; B</w:t><w:br/><w:t>dòng 2</w:t></w:r></w:p><w:p/>'
      + '<mc:AlternateContent><mc:Choice><w:p><w:r><w:t>Hộp chữ</w:t></w:r></w:p></mc:Choice><mc:Fallback><w:p><w:r><w:t>Hộp chữ</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent>'
      + '<w:p><w:r><w:t>&#7871;t &#x1EC7;</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
      + '</w:body></w:document>'
    expect(wordXmlToText(xml)).toBe('Cột\tA & B\ndòng 2\n\nHộp chữ\nết ệ\nA1')
  })
})

describe('docxToText', () => {
  it('reads paragraphs and table cells of a real DOCX in order', async () => {
    const cell = (text: string) => new TableCell({ children: [new Paragraph(text)] })
    const doc = new Document({ sections: [{ children: [
      new Paragraph('Mở đầu'),
      new Table({ rows: [new TableRow({ children: [cell('A1'), cell('B1')] }), new TableRow({ children: [cell('A2'), cell('B2')] })] }),
      new Paragraph({ children: [new TextRun('Kết'), new TextRun({ text: 'thúc', break: 1 })] }),
    ] }] })
    const result = docxToText(new Uint8Array(await Packer.toBuffer(doc)))
    expect(result.ok && result.text.split('\n').filter(Boolean)).toEqual(['Mở đầu', 'A1', 'B1', 'A2', 'B2', 'Kết', 'thúc'])
  })

  it('refuses a document.xml whose declared size is over the limit, without inflating it', () => {
    const zip = zipSync({ 'word/document.xml': strToU8('<w:p><w:r><w:t>dài</w:t></w:r></w:p>') })
    expect(docxToText(zip, 3)).toEqual({ ok: false, code: 'TOO_LARGE' })
  })

  it('says UNSUPPORTED for a non-zip or a zip without word/document.xml', () => {
    expect(docxToText(new Uint8Array([1, 2, 3]))).toEqual({ ok: false, code: 'UNSUPPORTED' })
    expect(docxToText(zipSync({ 'khac.txt': strToU8('x') }))).toEqual({ ok: false, code: 'UNSUPPORTED' })
  })
})
