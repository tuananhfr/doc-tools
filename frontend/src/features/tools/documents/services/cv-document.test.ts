import { describe, expect, it } from 'vitest'
import { emptyCv } from '../models/cv'
import { CV_TEMPLATES } from '../config/cv-templates'
import { cvDocument } from './cv-document'
import { documentFileStem } from '../types/print-document'
import { cvExample } from '../config/cv-examples'
const labels={name:'Name',role:'Role',summary:'Summary',experience:'Experience',education:'Education',skills:'Skills',languages:'Languages',certificates:'Certificates'}
describe('CV template output contract',()=>{
  it('provides five filled examples without sharing mutable draft data', () => {
    const examples = CV_TEMPLATES.map(t => cvExample(t.id))
    expect(new Set(examples.map(d => d.role)).size).toBe(5)
    expect(examples.every(d => d.name && d.summary && d.experience[0].description && d.education[0].title)).toBe(true)
    examples[0].experience[0].title = 'Changed locally'
    expect(cvExample('classic').experience[0].title).not.toBe('Changed locally')
    expect(new Set(CV_TEMPLATES.map(t => t.layout)).size).toBe(5)
  })
  it('retains all user content across five independent templates',()=>{
    const draft={...emptyCv(),name:'Nguyễn Văn QA',email:'qa@example.test',summary:'Summary marker',skills:'Skill marker',experience:[{period:'2020',organization:'Company marker',title:'Role marker',description:'Achievement marker'}]}
    expect(CV_TEMPLATES).toHaveLength(5)
    for(const template of CV_TEMPLATES){const document=cvDocument({...draft,template:template.id},labels);const text=[...document.blocks,...(document.sidebar??[])].map(b=>b.text).join('\n');for(const value of ['Nguyễn Văn QA','qa@example.test','Summary marker','Skill marker','Company marker','Role marker','Achievement marker'])expect(text).toContain(value)}
    expect(draft.template).toBe('classic')
  })
  it('sanitizes file names without dropping Vietnamese characters',()=>{expect(documentFileStem('Nguyễn / QA:*')).toBe('Nguyễn  QA');expect(documentFileStem('')).toBe('document')})
  it('preserves entry date columns instead of flattening dates into job headings', () => {
    const draft = cvExample('modern')
    const document = cvDocument(draft, labels)
    const entry = document.blocks.find(block => block.period === draft.experience[0].period)
    expect(entry?.text).toBe([draft.experience[0].title, draft.experience[0].organization].join('\n'))
    expect(document.cv).toBe(true)
    expect(document.blocks.some(block => block.kind === 'paragraph' && block.period === '')).toBe(true)
  })
})
