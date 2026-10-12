import { translate } from '@/i18n/runtime';
import type { FlowTask } from '@/features/tools/hub/types/flow.types';
import type { BarcodeEngine } from './barcode-render';
import { labelPages, type LabelSettings } from '../utils/label-layout';
import { labelCode, type LabelCodeKind } from '../utils/label-code';
export function labelTask(values: string[], settings: LabelSettings, kind: LabelCodeKind, engine: BarcodeEngine | null): FlowTask {
    return async (step) => {
        const pages = labelPages(values, settings), { PDFDocument, rgb } = await import('pdf-lib'), pdf = await PDFDocument.create(), pt = 72 / 25.4;
        const images = new Map<string, {
            image: Awaited<ReturnType<typeof pdf.embedPng>>;
            width: number;
            height: number;
        }>();
        let done = 0;
        for (const placements of pages) {
            step.signal.throwIfAborted();
            const page = pdf.addPage([210 * pt, 297 * pt]);
            for (const placement of placements) {
                step.signal.throwIfAborted();
                let encoded = images.get(placement.value);
                if (!encoded) {
                    const code = await labelCode(placement.value, kind, settings.widthMm, settings.heightMm, engine);
                    encoded = { image: await pdf.embedPng(new Uint8Array(await code.blob.arrayBuffer())), width: code.width, height: code.height };
                    images.set(placement.value, encoded);
                }
                const x = (placement.xMm + (settings.widthMm - encoded.width) / 2) * pt, y = (297 - placement.yMm - (settings.heightMm + encoded.height) / 2) * pt;
                page.drawImage(encoded.image, { x, y, width: encoded.width * pt, height: encoded.height * pt });
                page.drawRectangle({ x: placement.xMm * pt, y: (297 - placement.yMm - settings.heightMm) * pt, width: settings.widthMm * pt, height: settings.heightMm * pt, borderColor: rgb(.83, .85, .88), borderWidth: .2 });
                step.onProgress(++done, values.length * settings.copies);
                if (done % 10 === 0)
                    await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        step.signal.throwIfAborted();
        const bytes = await pdf.save();
        if (bytes.length > 100 * 1024 * 1024)
            throw new Error('LABEL_OUTPUT_LIMIT');
        return { title: translate('qr:labels.output'), output: { name: translate('qr:labels.file') + '.pdf', blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }) }, notes: [{ tone: 'info', text: translate('qr:labels.printHint') }] };
    };
}
