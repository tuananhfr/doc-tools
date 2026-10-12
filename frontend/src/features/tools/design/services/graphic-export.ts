import {pngDensity} from '../utils/png-density'
import { translate } from '@/i18n/runtime';
import type { FlowTask } from '@/features/tools/hub/types/flow.types';
import type { GraphicJob } from '../types/graphic.types';
import { GRAPHIC_LIMITS } from '../types/graphic.types';
import { graphicSheets } from '../utils/graphic-layout';
import { renderGraphicSheet } from './graphic-render';
import { setJpegDensity } from '@/features/tools/image/utils/jpeg-density';
export type GraphicOutput = 'png' | 'jpg' | 'pdf' | 'zip';
export function graphicTask(job: GraphicJob, format: GraphicOutput): FlowTask {
    return async (step) => {
        const sheets = graphicSheets(job), entries: Record<string, Uint8Array> = {}, title = translate('image:shop.outputTitle'), type = format === 'jpg' ? 'jpeg' : 'png';
        let bytesTotal = 0;
        const pdf = format === 'pdf' ? await (await import('pdf-lib')).PDFDocument.create() : null;
        for (const [index, files] of sheets.entries()) {
            step.signal.throwIfAborted();
            const image = await renderGraphicSheet(job, files, 300, type, step.signal), bytes = type === 'jpeg' ? new Uint8Array(await image.arrayBuffer()) : pngDensity(new Uint8Array(await image.arrayBuffer()),300);
            bytesTotal += bytes.length;
            if (bytesTotal > GRAPHIC_LIMITS.outputBytes)
                throw new Error('GRAPHIC_OUTPUT_LIMIT');
            if (type === 'jpeg')
                setJpegDensity(bytes, 300);
            if (pdf) {
                const page = pdf.addPage([job.template.widthMm / 25.4 * 72, job.template.heightMm / 25.4 * 72]), embedded = await pdf.embedPng(bytes);
                page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
            }
            else
                entries[String(index + 1).padStart(3, '0') + (type === 'jpeg' ? '.jpg' : '.png')] = bytes;
            step.onProgress(index + 1, sheets.length);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        step.signal.throwIfAborted();
        let blob: Blob, extension: string;
        if (pdf) {
            blob = new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' });
            extension = 'pdf';
        }
        else if (sheets.length === 1 && format !== 'zip') {
            blob = new Blob([Object.values(entries)[0] as Uint8Array<ArrayBuffer>], { type: type === 'jpeg' ? 'image/jpeg' : 'image/png' });
            extension = type === 'jpeg' ? 'jpg' : 'png';
        }
        else {
            const { zipSync } = await import('fflate');
            blob = new Blob([new Uint8Array(zipSync(entries, { level: 0 }))], { type: 'application/zip' });
            extension = 'zip';
        }
        return { title, output: { name: title + '.' + extension, blob }, notes: [{ tone: 'info', text: translate('image:shop.exportNote', { count: sheets.length, width: job.template.widthMm, height: job.template.heightMm }) }] };
    };
}
