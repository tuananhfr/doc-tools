import { describe, expect, it } from 'vitest'
import { editedOcrSources, layoutOcrText } from './ocr-text-layout'
describe('shared OCR paper layout', () => {
  const measure = (text: string, size: number) => Array.from(text).length * size
  it('wraps and paginates without losing text or mixing source pages', () => {
    const source = Array.from({ length: 90 }, (_, i) => `Line ${i}`).join('\n')
    const layout = layoutOcrText([source, 'Second input'], { paper: 'a4', margin: 0 }, measure)
    expect(layout.pages.length).toBeGreaterThan(2)
    expect(layout.pages.at(-1)!.sourceIndex).toBe(1)
    expect(editedOcrSources(layout, layout.pages.map(page => page.lines.join('\n')), 2)).toEqual([source, 'Second input'])
    const edited = layout.pages.map(page => page.lines.join('\n').replace('Line 45', 'Corrected 45'))
    expect(editedOcrSources(layout, edited, 2)[0]).toContain('Corrected 45')
    expect(editedOcrSources(layout, edited, 2)[1]).toBe('Second input')
  })
  it('uses the selected paper and margins and retains blank lines', () => {
    const layout = layoutOcrText(['First\n\nLast'], { paper: 'a3', margin: 20 }, measure)
    expect(layout.width).toBe(841.89)
    expect(layout.margin).toBeCloseTo(20 * 72 / 25.4)
    expect(layout.pages[0].lines).toEqual(['First', '', 'Last'])
  })
  it('wraps long identifiers without dropping characters', () => {
    const text = 'a'.repeat(500), layout = layoutOcrText([text], { paper: 'letter', margin: 0 }, measure)
    expect(layout.pages.flatMap(page => page.lines).join('')).toBe(text)
  })
  it('retains source answer spacing in both the paper editor and exported layout', () => {
    const layout = layoutOcrText(['A. One    B. Two\n\nNext question'], { paper: 'a4', margin: 0 }, measure)
    expect(layout.pages[0].lines).toEqual(['A. One    B. Two', '', 'Next question'])
  })
})
