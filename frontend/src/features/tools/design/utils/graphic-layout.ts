import type { GraphicJob, GraphicTemplate } from '../types/graphic.types';
import { GRAPHIC_LIMITS } from '../types/graphic.types';
export function graphicSheets(job: GraphicJob): File[][] {
    if (job.files.length > GRAPHIC_LIMITS.files || !Number.isInteger(job.template.slots) || job.template.slots < 1)
        throw new Error('GRAPHIC_INPUT_LIMIT');
    if (!job.files.length)
        return [[]];
    return Array.from({ length: Math.ceil(job.files.length / job.template.slots) }, (_, index) => job.files.slice(index * job.template.slots, (index + 1) * job.template.slots));
}
export function graphicDimensions(template: GraphicTemplate, dpi = 300) {
    if (![template.widthMm, template.heightMm, dpi].every(Number.isFinite) || template.widthMm < 10 || template.heightMm < 10 || template.widthMm > 400 || template.heightMm > 400 || dpi < 30 || dpi > 300)
        throw new Error('INVALID_GRAPHIC_SIZE');
    const width = Math.round(template.widthMm / 25.4 * dpi), height = Math.round(template.heightMm / 25.4 * dpi);
    if (width * height > GRAPHIC_LIMITS.pixels)
        throw new Error('GRAPHIC_PIXEL_LIMIT');
    return { width, height };
}
