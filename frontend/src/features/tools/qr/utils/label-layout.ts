export interface LabelSettings {
    widthMm: number;
    heightMm: number;
    copies: number;
    gapMm: number;
    marginMm: number;
}
export interface LabelPlacement {
    value: string;
    xMm: number;
    yMm: number;
}
export function labelPages(values: string[], settings: LabelSettings): LabelPlacement[][] {
    const { widthMm: width, heightMm: height, copies, gapMm: gap, marginMm: margin } = settings;
    if (![width, height, gap, margin, copies].every(Number.isFinite) || width < 20 || height < 20 || width > 190 || height > 277
        || gap < 0 || gap > 10 || margin < 5 || margin > 20 || !Number.isInteger(copies) || copies < 1 || copies > 100
        || !values.length || values.length * copies > 500)
        throw new Error('LABEL_INPUT_INVALID');
    const columns = Math.floor((210 - margin * 2 + gap) / (width + gap)), rows = Math.floor((297 - margin * 2 + gap) / (height + gap));
    const perPage = columns * rows;
    if (perPage < 1)
        throw new Error('LABEL_DOES_NOT_FIT');
    const entries = values.flatMap(value => Array.from({ length: copies }, () => value));
    const pages: LabelPlacement[][] = [];
    for (const [index, value] of entries.entries()) {
        const slot = index % perPage, pageIndex = Math.floor(index / perPage);
        pages[pageIndex] ??= [];
        pages[pageIndex].push({ value, xMm: margin + slot % columns * (width + gap), yMm: margin + Math.floor(slot / columns) * (height + gap) });
    }
    return pages;
}
