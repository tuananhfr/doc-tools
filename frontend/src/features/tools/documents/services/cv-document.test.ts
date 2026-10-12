import { describe, expect, it } from 'vitest'
import { emptyCv } from '../models/cv'
import { CV_TEMPLATES } from '../config/cv-templates'
import { cvDocument } from './cv-document'
import { documentFileStem } from '../types/print-document'
const labels={name:'Name',role:'Role',summary:'Summary',experience:'Experience',education:'Education',skills:'Skills',languages:'Languages',certificates:'Certificates'}
describe('CV template output contract',()=>{
  it('retains all user content across five independent templates',()=>{
    const draft={...emptyCv(),name:'Nguyễn Văn QA',email:'qa@example.test',summary:'Summary marker',skills:'Skill marker',experience:[{period:'2020',organization:'Company marker',title:'Role marker',description:'Achievement marker'}]}
    expect(CV_TEMPLATES).toHaveLength(5)
    for(const template of CV_TEMPLATES){const document=cvDocument({...draft,template:template.id},labels);const text=[...document.blocks,...(document.sidebar??[])].map(b=>b.text).join('\n');for(const value of ['Nguyễn Văn QA','qa@example.test','Summary marker','Skill marker','Company marker','Role marker','Achievement marker'])expect(text).toContain(value)}
    expect(draft.template).toBe('classic')
  })
  it('sanitizes file names without dropping Vietnamese characters',()=>{expect(documentFileStem('Nguyễn / QA:*')).toBe('Nguyễn  QA');expect(documentFileStem('')).toBe('document')})
})
