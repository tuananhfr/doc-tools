export interface GraphicTemplate {
    id: string;
    kind: 'grid' | 'logo' | 'watermark' | 'voucher' | 'label' | 'poster' | 'cup' | 'box' | 'bag' | 'seal' | 'gift';
    widthMm: number;
    heightMm: number;
    slots: number;
    columns: number;
    marginMm: number;
}
export interface GraphicBrand {
    title: string;
    subtitle: string;
    accent: string;
    background: string;
    fit: 'cover' | 'contain';
}
export interface GraphicJob {
    template: GraphicTemplate;
    brand: GraphicBrand;
    files: File[];
    logo: File | null;
}
export const GRAPHIC_LIMITS = { files: 100, sheets: 100, outputBytes: 300 * 1024 * 1024, pixels: 16000000 } as const;
