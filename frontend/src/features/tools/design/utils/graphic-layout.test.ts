import { describe, expect, it } from 'vitest';
import { SHOP_LAYOUTS, DESIGN_TEMPLATES } from '../config/graphic-templates';
import { graphicDimensions, graphicSheets } from './graphic-layout';
const brand = { title: 'Shop', subtitle: '', accent: '#005bea', background: '#ffffff', fit: 'contain' as const };
describe('graphic template adapters', () => {
    it('keeps all 20 uploaded images in order across each layout', () => { const files = Array.from({ length: 20 }, (_, i) => new File(['image'], `item-${i}.jpg`)); for (const template of SHOP_LAYOUTS) {
        const sheets = graphicSheets({ template, brand, files, logo: null });
        expect(sheets.flat()).toEqual(files);
        expect(sheets.every(sheet => sheet.length <= template.slots)).toBe(true);
    } });
    it('uses bounded physical output dimensions for every design template', () => { for (const template of DESIGN_TEMPLATES) {
        const size = graphicDimensions(template);
        expect(size.width * size.height).toBeLessThanOrEqual(16000000);
        expect(size.width).toBe(Math.round(template.widthMm / 25.4 * 300));
    } expect(() => graphicDimensions({ ...DESIGN_TEMPLATES[0], widthMm: NaN })).toThrow(); });
});
