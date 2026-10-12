import type { GraphicTemplate } from '../types/graphic.types';
export const SHOP_LAYOUTS: readonly GraphicTemplate[] = [1, 2, 3, 4, 6, 9].map(slots => ({ id: 'grid-' + slots, kind: 'grid', widthMm: 150, heightMm: 150, slots, columns: slots === 1 ? 1 : slots <= 4 ? 2 : 3, marginMm: 4 }));
export const DESIGN_TEMPLATES: readonly GraphicTemplate[] = [
    { id: 'logo', kind: 'logo', widthMm: 100, heightMm: 100, slots: 1, columns: 1, marginMm: 8 },
    { id: 'watermark', kind: 'watermark', widthMm: 150, heightMm: 150, slots: 1, columns: 1, marginMm: 6 },
    { id: 'voucher', kind: 'voucher', widthMm: 150, heightMm: 70, slots: 1, columns: 1, marginMm: 5 },
    { id: 'label', kind: 'label', widthMm: 60, heightMm: 40, slots: 1, columns: 1, marginMm: 3 },
    { id: 'poster', kind: 'poster', widthMm: 210, heightMm: 297, slots: 1, columns: 1, marginMm: 10 },
    { id: 'cup', kind: 'cup', widthMm: 200, heightMm: 90, slots: 1, columns: 1, marginMm: 5 },
    { id: 'box', kind: 'box', widthMm: 200, heightMm: 200, slots: 1, columns: 1, marginMm: 8 },
    { id: 'bag', kind: 'bag', widthMm: 200, heightMm: 250, slots: 1, columns: 1, marginMm: 10 },
];
