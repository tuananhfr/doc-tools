import { describe, expect, it } from 'vitest';
import { labelPages } from './label-layout';
describe('physical label packing', () => {
    it('keeps all 500 labels in order within A4 without overlap', () => {
        const values = Array.from({ length: 250 }, (_, index) => String(index)), settings = { widthMm: 60, heightMm: 40, copies: 2, gapMm: 2, marginMm: 8 };
        const pages = labelPages(values, settings), entries = pages.flat();
        expect(entries.map(item => item.value)).toEqual(values.flatMap(value => [value, value]));
        for (const page of pages)
            for (const [i, item] of page.entries()) {
                expect(item.xMm + settings.widthMm).toBeLessThanOrEqual(210 - settings.marginMm);
                expect(item.yMm + settings.heightMm).toBeLessThanOrEqual(297 - settings.marginMm);
                for (const other of page.slice(i + 1))
                    expect(item.xMm + settings.widthMm <= other.xMm || other.xMm + settings.widthMm <= item.xMm || item.yMm + settings.heightMm <= other.yMm || other.yMm + settings.heightMm <= item.yMm).toBe(true);
            }
    });
    it('rejects excessive output and labels that cannot fit', () => {
        expect(() => labelPages(['a', 'b', 'c', 'd', 'e', 'f'], { widthMm: 60, heightMm: 40, copies: 100, gapMm: 2, marginMm: 8 })).toThrow();
        expect(() => labelPages(['a'], { widthMm: 190, heightMm: 277, copies: 1, gapMm: 2, marginMm: 20 })).toThrow();
    });
});
