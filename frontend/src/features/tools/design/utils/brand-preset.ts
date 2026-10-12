import type { GraphicBrand } from '../types/graphic.types';
export const BRAND_PRESET_KEY = 'chuyen-nho-brand-preset-v1';
export function readBrandPreset(storage: Pick<Storage, 'getItem'>): GraphicBrand | null {
    try {
        const raw = storage.getItem(BRAND_PRESET_KEY);
        if (!raw || raw.length > 4000)
            return null;
        const value = JSON.parse(raw) as Partial<GraphicBrand>;
        if (typeof value.title !== 'string' || value.title.length > 80 || typeof value.subtitle !== 'string' || value.subtitle.length > 160
            || !/^#[a-f0-9]{6}$/i.test(value.accent ?? '') || !['#ffffff', '#f0f6ff', 'transparent'].includes(value.background ?? '') || !['cover', 'contain'].includes(value.fit ?? ''))
            return null;
        return value as GraphicBrand;
    }
    catch {
        return null;
    }
}
export function saveBrandPreset(storage: Pick<Storage, 'setItem'>, value: GraphicBrand) { storage.setItem(BRAND_PRESET_KEY, JSON.stringify(value)); }
